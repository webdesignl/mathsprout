import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRateLimiter, TUTOR_LIMIT, TUTOR_WINDOW_MS } from '../server/utils/tutor/rateLimit'
import { REMOVED, stripPersonalDetails } from '../server/utils/tutor/sanitize'
import { DEMO_PROBLEM, isDemoMode } from '../server/utils/tutor/demo'
import { handleExplain, handleHint, handleRead, type TutorDeps } from '../server/utils/tutor/handlers'
import { FAILURE_MESSAGES } from '../server/utils/tutor/messages'
import { logTutorError, replyText } from '../server/utils/anthropic'
import { SUB, fakeClient } from './tutor-helpers'

describe('stripPersonalDetails', () => {
  it('removes email addresses', () => {
    expect(stripPersonalDetails('write to mia.chen+math@example.co.uk now')).toBe(`write to ${REMOVED} now`)
  })

  it('removes phone numbers in common forms', () => {
    for (const phone of ['555-123-4567', '(555) 123 4567', '555.123.4567', '5551234567', '+44 20 7946 0958']) {
      expect(stripPersonalDetails(`call ${phone} today`), phone).toBe(`call ${REMOVED} today`)
    }
  })

  it('removes names that are introduced', () => {
    expect(stripPersonalDetails('My name is Mia Chen and I like math')).toBe(`My name is ${REMOVED} and I like math`)
    expect(stripPersonalDetails("I'm Sam. Hi Priya, here is my work")).toBe(`I'm ${REMOVED}. Hi ${REMOVED}, here is my work`)
    expect(stripPersonalDetails('Name: Lee Park')).toBe(`Name: ${REMOVED}`)
  })

  it('leaves math alone: fractions, mixed numbers, long numbers and ordinary sentences', () => {
    for (const text of [
      '8 1/5 - 4 3/4 = 3 9/20',
      'I am done with 12 problems',
      'I am confident about 24/20 - 15/20',
      '1234 + 5678',
      'Hi there, I made the bottoms the same',
      'The answer is 69/20 or 3 9/20 and 100/200',
    ]) {
      expect(stripPersonalDetails(text), text).toBe(text)
    }
  })
})

describe('rate limiter', () => {
  it('allows 30 requests per 10 minutes per IP and blocks the 31st', () => {
    const limiter = createRateLimiter()
    for (let i = 0; i < TUTOR_LIMIT; i++) expect(limiter.check('1.1.1.1').allowed).toBe(true)
    const blocked = limiter.check('1.1.1.1')
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSec).toBeGreaterThan(0)
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(TUTOR_WINDOW_MS / 1000)
    expect(TUTOR_LIMIT).toBe(30)
    expect(TUTOR_WINDOW_MS).toBe(10 * 60 * 1000)
  })

  it('counts each IP separately', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 })
    limiter.check('a')
    limiter.check('a')
    expect(limiter.check('a').allowed).toBe(false)
    expect(limiter.check('b').allowed).toBe(true)
  })

  it('lets requests through again once the window has passed', () => {
    let now = 0
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 }, () => now)
    limiter.check('a')
    limiter.check('a')
    expect(limiter.check('a').allowed).toBe(false)
    now = 1001
    expect(limiter.check('a').allowed).toBe(true)
  })

  it('is a sliding window: old requests drop off one at a time', () => {
    let now = 0
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 }, () => now)
    limiter.check('a') // t=0
    now = 600
    limiter.check('a') // t=600
    now = 1100 // the first one has dropped off
    expect(limiter.check('a').allowed).toBe(true)
    expect(limiter.check('a').allowed).toBe(false)
  })

  it('does not count blocked requests against her', () => {
    let now = 0
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 }, () => now)
    limiter.check('a')
    for (let i = 0; i < 5; i++) limiter.check('a')
    now = 1001
    expect(limiter.check('a').allowed).toBe(true)
  })

  it('reset clears everything', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 })
    limiter.check('a')
    limiter.reset()
    expect(limiter.check('a').allowed).toBe(true)
  })
})

describe('DEMO_MODE', () => {
  it('reads the DEMO_MODE environment variable', () => {
    expect(isDemoMode({ DEMO_MODE: 'true' })).toBe(true)
    expect(isDemoMode({ DEMO_MODE: 'TRUE' })).toBe(true)
    expect(isDemoMode({ DEMO_MODE: '1' })).toBe(true)
    expect(isDemoMode({ DEMO_MODE: 'false' })).toBe(false)
    expect(isDemoMode({ DEMO_MODE: '' })).toBe(false)
    expect(isDemoMode({})).toBe(false)
  })
})

function deps(overrides: Partial<TutorDeps> = {}): TutorDeps {
  return { client: null, demo: false, limiter: createRateLimiter(), ip: '9.9.9.9', ...overrides }
}

describe('route handlers', () => {
  it('in DEMO_MODE all three routes return canned answers and never call the API', async () => {
    const { client, create } = fakeClient('should never be used')
    const d = deps({ client, demo: true })

    const read = await handleRead({ text: 'anything' }, d)
    expect(read.status).toBe(200)
    expect(read.body).toMatchObject({ ok: true, problem: DEMO_PROBLEM, operands: ['8 1/5', '4 3/4'] })

    const hint = await handleHint({ problem: SUB, studentAnswer: '3 11/20', stuck: false, level: 1 }, d)
    expect(hint.body).toMatchObject({ ok: true, source: 'demo', level: 1 })
    expect((hint.body as { hint: string }).hint).toMatch(/\?$/)

    const explain = await handleExplain({ problem: SUB, explanation: 'I matched the bottoms' }, d)
    expect(explain.body).toMatchObject({ ok: true, verdict: 'clear', source: 'demo' })

    expect(create).not.toHaveBeenCalled()
  })

  it('still validates input in DEMO_MODE', async () => {
    const d = deps({ demo: true })
    expect((await handleRead({}, d)).status).toBe(400)
    expect((await handleHint({ problem: SUB, stuck: false, level: 9 }, d)).status).toBe(400)
    expect((await handleExplain({ problem: SUB, explanation: '' }, d)).status).toBe(400)
  })

  it('returns 400 with a kind message for bad input and never echoes the input back', async () => {
    const res = await handleRead({ text: '' , secret: 'Mia Chen' }, deps())
    expect(res.status).toBe(400)
    expect(JSON.stringify(res.body)).not.toContain('Mia')
    expect(res.body).toMatchObject({ ok: false, reason: 'bad_request', message: FAILURE_MESSAGES.bad_request })
  })

  it('returns 429 with a Retry-After header after 30 requests, shared across all three routes', async () => {
    const d = deps({ demo: true })
    const bodies: Array<() => Promise<unknown>> = [
      () => handleRead({ text: 'x' }, d),
      () => handleHint({ problem: SUB, stuck: true, level: 1 }, d),
      () => handleExplain({ problem: SUB, explanation: 'I matched the bottoms' }, d),
    ]
    for (let i = 0; i < 30; i++) await bodies[i % 3]!()
    for (const call of bodies) {
      const res = (await call()) as Awaited<ReturnType<typeof handleRead>>
      expect(res.status).toBe(429)
      expect(Number(res.headers?.['Retry-After'])).toBeGreaterThan(0)
      expect(res.body).toMatchObject({ ok: false, reason: 'rate_limited' })
    }
  })

  it('checks the rate limit before doing any work', async () => {
    const { client, create } = fakeClient('{"unsupported":true}')
    const limiter = createRateLimiter({ limit: 0, windowMs: 1000 })
    const res = await handleRead({ text: 'x' }, deps({ client, limiter }))
    expect(res.status).toBe(429)
    expect(create).not.toHaveBeenCalled()
  })

  it('read returns unavailable (503) when there is no API key, and 413 for a huge photo', async () => {
    expect((await handleRead({ text: '8 1/5 - 4 3/4' }, deps())).status).toBe(503)
    const { client } = fakeClient('{}')
    const huge = 'A'.repeat(7_200_000)
    const res = await handleRead({ imageBase64: huge, mediaType: 'image/png' }, deps({ client }))
    expect(res.status).toBe(413)
    expect(res.body).toMatchObject({ reason: 'too_large' })
  })

  it('read returns unsupported with a kid-friendly message', async () => {
    const { client } = fakeClient('{"unsupported":true}')
    const res = await handleRead({ text: '3 x 4' }, deps({ client }))
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: false, reason: 'unsupported', message: FAILURE_MESSAGES.unsupported })
  })

  it('hint and explain still work with no API key (templates)', async () => {
    const hint = await handleHint({ problem: SUB, studentAnswer: '3 11/20', stuck: false, level: 2 }, deps())
    expect(hint.status).toBe(200)
    expect(hint.body).toMatchObject({ ok: true, source: 'template' })
    const explain = await handleExplain({ problem: SUB, explanation: 'I matched the bottoms and borrowed.' }, deps())
    expect(explain.body).toMatchObject({ ok: true, source: 'template' })
  })

  it('hint returns the AI hint when it is clean', async () => {
    const { client } = fakeClient('What do you do with the top numbers once the bottoms match?')
    const res = await handleHint({ problem: SUB, studentAnswer: '3 11/20', stuck: false, level: 2 }, deps({ client }))
    expect(res.body).toMatchObject({ ok: true, source: 'ai', level: 2 })
  })
})

describe('never log images or student text', () => {
  let spies: Array<ReturnType<typeof vi.spyOn>>
  beforeEach(() => {
    spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}))
  })
  afterEach(() => {
    spies.forEach((s) => s.mockRestore())
  })

  it('logs only the kind of failure and the status', () => {
    const error = Object.assign(new Error('request body: Mia Chen 3 11/20 data:image/png;base64,AAAA'), { status: 529 })
    logTutorError('read', error)
    const logged = spies.flatMap((s) => s.mock.calls).flat().join(' ')
    expect(logged).toBe('[tutor:read] Error 529')
  })

  it('a full failed request logs nothing of the student text or the picture', async () => {
    const { client } = fakeClient(Object.assign(new Error('Mia Chen AAAABBBB 3 11/20'), { status: 500 }))
    await handleRead({ imageBase64: 'AAAABBBB', mediaType: 'image/png' }, deps({ client }))
    await handleHint({ problem: SUB, studentAnswer: 'Mia Chen 3 11/20', stuck: false, level: 1 }, deps({ client }))
    await handleExplain({ problem: SUB, explanation: 'Mia Chen explains the bottoms' }, deps({ client }))
    const logged = spies.flatMap((s) => s.mock.calls).flat().join(' ')
    expect(logged).not.toMatch(/Mia|AAAABBBB|11\/20|bottoms/)
  })
})

describe('Anthropic client', () => {
  it('replyText joins text blocks and returns nothing for a refusal', () => {
    const message = { content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }], stop_reason: 'end_turn' }
    expect(replyText(message as never)).toBe('a b')
    expect(replyText({ ...message, stop_reason: 'refusal' } as never)).toBe('')
  })
})
