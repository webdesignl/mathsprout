import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTutorStore } from '../app/stores/tutor'
import type { Plan } from '../app/utils/plan'
import type { ReadReply, TutorApi } from '../app/utils/tutorApi'
import { handleRead } from '../server/utils/tutor/handlers'
import { createRateLimiter } from '../server/utils/tutor/rateLimit'
import { readProblem } from '../server/utils/tutor/read'
import { fakeClient } from './tutor-helpers'

const PHOTO = { imageBase64: 'AAAA', mediaType: 'image/jpeg' as const }
const transcript = (text: string, confidence = 'high') => JSON.stringify({ text, confidence })

describe('reading a photo copies it out as text first', () => {
  it('returns the text for her to check, with no problem yet', async () => {
    const { client, calls } = fakeClient(transcript('1/5 of the people did not finish. What is left?'))
    const result = await readProblem(client, PHOTO)
    expect(result).toEqual({ ok: true, transcript: '1/5 of the people did not finish. What is left?', confidence: 'high' })
    expect(String(calls[0]!.system)).toMatch(/Ignore any working/)
  })

  it('removes personal details from the copied text', async () => {
    const { client } = fakeClient(transcript('Call me at 555-123-4567. 1/2 + 1/3?'))
    const result = await readProblem(client, PHOTO)
    expect(JSON.stringify(result)).not.toContain('555-123-4567')
  })

  it('says it could not read a photo with no problem, and asks again once for a bad reply', async () => {
    expect(await readProblem(fakeClient('{"unreadable":true}').client, PHOTO)).toMatchObject({ ok: false, reason: 'unreadable' })
    const { client, create } = fakeClient('not json', transcript('1/2 + 1/3'))
    expect(await readProblem(client, PHOTO)).toMatchObject({ ok: true, transcript: '1/2 + 1/3' })
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('typed text is still read straight into a problem', async () => {
    const { client } = fakeClient(JSON.stringify({ operation: 'add', operands: ['1/2', '1/3'], problemText: 'half plus a third', confidence: 'high' }))
    expect(await readProblem(client, { text: '1/2 + 1/3' })).toMatchObject({ ok: true, problem: { op: 'add' } })
  })

  it('demo mode copies a photo as text with no API call', async () => {
    const { client, create } = fakeClient('')
    const res = await handleRead(PHOTO, { client, demo: true, limiter: createRateLimiter(), ip: '1.1.1.1' })
    expect(res.body).toMatchObject({ ok: true, transcript: expect.any(String) })
    expect(create).not.toHaveBeenCalled()
  })
})

const PLAN: Plan = {
  steps: [
    { op: 'subtract', a: '1', b: '1/5', label: 'What fraction finished?' },
    { op: 'multiply', a: 'r1', b: '1/6', label: 'What fraction finished and were children?' },
  ],
}

function fakeApi(replies: { photo?: ReadReply; text?: ReadReply }) {
  const read = vi.fn(async (body: { imageBase64?: string; text?: string }) =>
    'imageBase64' in body
      ? (replies.photo ?? { ok: true as const, transcript: 'A race story.', confidence: 'high' as const })
      : (replies.text ?? { ok: true as const, plan: PLAN, problemText: 'A race story.', confidence: 'high' as const }),
  )
  const api = {
    read,
    understand: vi.fn(async () => ({ ok: true as const, text: 'Picture it.', source: 'ai' })),
    hint: vi.fn(async ({ level }: { level: 1 | 2 | 3 }) => ({ ok: true as const, hint: 'Hint?', source: 'ai', level })),
  }
  return { api: api as unknown as TutorApi, read }
}

describe('the Tutor review step', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows the copied text to edit, and nothing is solved yet', async () => {
    const store = useTutorStore()
    const { api, read } = fakeApi({})
    store.setApi(api)
    expect(await store.readProblem(PHOTO)).toBe(true)
    expect(store.state).toBe('review')
    expect(store.reviewText).toBe('A race story.')
    expect(store.problem).toBeNull()
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('her fixed text is read, and a multi-step plan starts at step 1 with no second confirm', async () => {
    const store = useTutorStore()
    const { api, read } = fakeApi({})
    store.setApi(api)
    await store.readProblem(PHOTO)
    store.reviewText = 'A fixed race story.'
    expect(await store.submitReviewed(store.reviewText)).toBe(true)
    expect(read).toHaveBeenLastCalledWith({ text: 'A fixed race story.' })
    expect(store.plan?.steps).toHaveLength(2)
    expect(store.state).toBe('understand')
    expect(store.stepIndex).toBe(0)
  })

  it('a single problem goes on to understand, then confirm, as before', async () => {
    const store = useTutorStore()
    const single: ReadReply = {
      ok: true,
      problem: { op: 'add', a: { whole: 0, num: 1, den: 2 }, b: { whole: 0, num: 1, den: 3 } },
      operands: ['1/2', '1/3'],
      problemText: 'half plus a third',
      confidence: 'high',
    }
    const { api } = fakeApi({ text: single })
    store.setApi(api)
    await store.readProblem(PHOTO)
    await store.submitReviewed('half plus a third')
    expect(store.state).toBe('understand')
    store.chooseOperation('add')
    store.continueFromUnderstanding()
    expect(store.state).toBe('confirm')
  })

  it('stays on the review screen with a kind message if the text can not be read, and rejects empty text', async () => {
    const store = useTutorStore()
    const { api } = fakeApi({ text: { ok: false, reason: 'unreadable', message: 'I could not read that one.' } })
    store.setApi(api)
    await store.readProblem(PHOTO)
    expect(await store.submitReviewed('   ')).toBe(false)
    expect(store.error).toBeTruthy()
    expect(await store.submitReviewed('something')).toBe(false)
    expect(store.state).toBe('review')
    expect(store.error).toBe('I could not read that one.')
  })

  it('only works on the review screen, and reset clears it', async () => {
    const store = useTutorStore()
    const { api } = fakeApi({})
    store.setApi(api)
    expect(await store.submitReviewed('x')).toBe(false)
    await store.readProblem(PHOTO)
    store.reset()
    expect(store.state).toBe('capture')
    expect(store.reviewText).toBe('')
  })
})
