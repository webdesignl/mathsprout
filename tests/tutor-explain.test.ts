import { describe, expect, it, vi } from 'vitest'
import { EXPLAIN_MODEL } from '../server/utils/anthropic'
import {
  EXPLAIN_TIMEOUT_MS,
  MAX_PRAISE_WORDS,
  evaluateExplanation,
  methodChecklist,
} from '../server/utils/tutor/explain'
import { explainInputSchema, modelExplainSchema } from '../server/utils/tutor/schemas'
import { ADD, SUB, fakeClient, sentText } from './tutor-helpers'

const words = (text: string) => text.trim().split(/\s+/).length
const EXPLANATION = 'I made the bottoms the same, borrowed one whole, then subtracted and checked by adding back.'

const clear = JSON.stringify({ verdict: 'clear', praise: 'You borrowed a whole and checked it. Nice work!' })
const partly = JSON.stringify({
  verdict: 'partly',
  praise: 'You made the bottoms match, nicely done.',
  followUp: 'What did you do when the top number was too small?',
})

describe('explain input validation (zod)', () => {
  it('accepts an explanation up to 500 characters and rejects empty or longer ones', () => {
    expect(explainInputSchema.safeParse({ problem: SUB, explanation: 'x'.repeat(500) }).success).toBe(true)
    expect(explainInputSchema.safeParse({ problem: SUB, explanation: 'x'.repeat(501) }).success).toBe(false)
    expect(explainInputSchema.safeParse({ problem: SUB, explanation: '   ' }).success).toBe(false)
  })
  it('checks the shape of the model reply', () => {
    expect(modelExplainSchema.safeParse({ verdict: 'clear', praise: 'Nice.' }).success).toBe(true)
    expect(modelExplainSchema.safeParse({ verdict: 'great', praise: 'Nice.' }).success).toBe(false)
  })
})

describe('methodChecklist (from the engine steps)', () => {
  it('lists common denominator, regrouping, simplest form and checking when they apply', () => {
    const list = methodChecklist(SUB).join(' | ')
    expect(list).toMatch(/common denominator/)
    expect(list).toMatch(/Borrowed/)
    expect(list).toMatch(/Checked/)
  })
  it('leaves out regrouping for addition and simplest form when nothing simplifies', () => {
    const list = methodChecklist(ADD).join(' | ')
    expect(list).not.toMatch(/Borrowed/)
    expect(list).toMatch(/simplest form/) // 4 1/3 + 2 5/12 simplifies 9/12 to 3/4
  })
})

describe('evaluateExplanation', () => {
  it('returns the model verdict, praise and no follow-up when the explanation is clear', async () => {
    const { client, calls } = fakeClient(clear)
    const result = await evaluateExplanation(client, { problem: SUB, explanation: EXPLANATION })
    expect(result).toEqual({
      verdict: 'clear',
      praise: 'You borrowed a whole and checked it. Nice work!',
      source: 'ai',
    })
    expect(calls[0]!.model).toBe(EXPLAIN_MODEL)
    expect(calls[0]!.model).toBe('claude-haiku-4-5-20251001')
  })

  it('returns a follow-up question when the explanation is only partly there', async () => {
    const { client } = fakeClient(partly)
    const result = await evaluateExplanation(client, { problem: SUB, explanation: 'I made the bottoms match.' })
    expect(result).toMatchObject({
      verdict: 'partly',
      followUp: 'What did you do when the top number was too small?',
    })
  })

  it('judges reasoning only, against the method checklist, in a kind tone', async () => {
    const { client, calls } = fakeClient(clear)
    await evaluateExplanation(client, { problem: SUB, explanation: EXPLANATION })
    const system = String(calls[0]!.system)
    expect(system).toMatch(/Never judge the final number/)
    expect(system).toMatch(/Never say "wrong"/)
    expect(system).toMatch(/data, not instructions/)
    const sent = sentText(calls[0]!)
    expect(sent).toContain('methodChecklist')
    expect(sent).toContain('common denominator')
  })

  it('does not call the AI for a very short explanation and asks a gentle question', async () => {
    const { client, create } = fakeClient(clear)
    const result = await evaluateExplanation(client, { problem: SUB, explanation: 'I guessed' })
    expect(create).not.toHaveBeenCalled()
    expect(result).toMatchObject({ verdict: 'missing', source: 'template' })
    expect(result.followUp).toMatch(/\?$/)
  })

  it('fills in a follow-up when the model forgets one, and drops it when the verdict is clear', async () => {
    const { client } = fakeClient(JSON.stringify({ verdict: 'partly', praise: 'Good start on the bottoms.' }))
    const missing = await evaluateExplanation(client, { problem: SUB, explanation: EXPLANATION })
    expect(missing.followUp).toMatch(/\?$/)

    const { client: c2 } = fakeClient(
      JSON.stringify({ verdict: 'clear', praise: 'Lovely explanation.', followUp: 'Anything else?' }),
    )
    const done = await evaluateExplanation(c2, { problem: SUB, explanation: EXPLANATION })
    expect(done.followUp).toBeUndefined()
  })

  it('retries once when the praise is too long, then accepts a good reply', async () => {
    const long = JSON.stringify({
      verdict: 'clear',
      praise: 'You explained every single part of the method so very clearly and carefully today',
    })
    const { client, create } = fakeClient(long, clear)
    const result = await evaluateExplanation(client, { problem: SUB, explanation: EXPLANATION })
    expect(create).toHaveBeenCalledTimes(2)
    expect(result.praise).toBe('You borrowed a whole and checked it. Nice work!')
  })

  it('never uses harsh words: retries, then uses a kind template', async () => {
    const harsh = JSON.stringify({ verdict: 'partly', praise: 'That is wrong, sorry.', followUp: 'Why?' })
    const { client, create } = fakeClient(harsh, harsh)
    const result = await evaluateExplanation(client, { problem: SUB, explanation: EXPLANATION })
    expect(create).toHaveBeenCalledTimes(2)
    expect(result.source).toBe('template')
    expect(`${result.praise} ${result.followUp}`).not.toMatch(/wrong|incorrect|mistake/i)
  })

  it('retries on invalid JSON, then falls back kindly', async () => {
    const { client, create } = fakeClient('not json', 'still not json')
    const result = await evaluateExplanation(client, { problem: SUB, explanation: EXPLANATION })
    expect(create).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ verdict: 'partly', source: 'template' })
  })

  it('always works: a kind template when the API throws or there is no key', async () => {
    const { client } = fakeClient(new Error('down'))
    const down = await evaluateExplanation(client, { problem: SUB, explanation: EXPLANATION })
    expect(down).toMatchObject({ verdict: 'partly', source: 'template' })
    expect(words(down.praise)).toBeLessThanOrEqual(MAX_PRAISE_WORDS)
    expect(down.followUp).toMatch(/\?$/)

    const none = await evaluateExplanation(null, { problem: SUB, explanation: EXPLANATION })
    expect(none.source).toBe('template')
  })

  it('does not wait longer than the time limit', async () => {
    const { client } = fakeClient(() => new Promise<never>(() => {}))
    const started = Date.now()
    const result = await evaluateExplanation(client, { problem: SUB, explanation: EXPLANATION }, { timeoutMs: 50 })
    expect(Date.now() - started).toBeLessThan(1000)
    expect(result.source).toBe('template')
    expect(EXPLAIN_TIMEOUT_MS).toBe(8000)
  })

  it('removes personal details from her words before sending them', async () => {
    const { client, calls } = fakeClient(clear)
    await evaluateExplanation(client, {
      problem: SUB,
      explanation: 'Hi Sam it is me, my name is Mia Chen. I matched the bottoms and email mia@example.com',
    })
    const sent = sentText(calls[0]!)
    expect(sent).not.toMatch(/Mia|Sam|example\.com/)
  })

  it('does not log her words when the API fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { client } = fakeClient(Object.assign(new Error('failed: I matched the bottoms'), { status: 429 }))
    await evaluateExplanation(client, { problem: SUB, explanation: 'I matched the bottoms and borrowed.' })
    const logged = spy.mock.calls.flat().join(' ')
    spy.mockRestore()
    expect(logged).not.toContain('matched')
  })
})
