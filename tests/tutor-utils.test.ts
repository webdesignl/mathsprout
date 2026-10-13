import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_EDGE, bytesToBase64, fitWithin } from '../app/utils/image'
import { OFFLINE_MESSAGE, TROUBLE_MESSAGE, createTutorApi, problemError } from '../app/utils/tutorApi'
import { LEVEL_HINTS, hintTarget, localHint } from '../app/utils/tutorHints'
import type { Problem } from '../app/utils/fraction'

const SUB: Problem = { op: 'subtract', a: { whole: 8, num: 1, den: 5 }, b: { whole: 4, num: 3, den: 4 } }

describe('fitWithin (photo resizing)', () => {
  it('shrinks the long edge to 1568 and keeps the shape', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 1568, height: 1176 })
    expect(fitWithin(3024, 4032)).toEqual({ width: 1176, height: 1568 })
    expect(fitWithin(3136, 3136)).toEqual({ width: 1568, height: 1568 })
  })

  it('never makes a small picture bigger', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(1568, 1000)).toEqual({ width: 1568, height: 1000 })
    expect(MAX_EDGE).toBe(1568)
  })

  it('handles odd and empty sizes without breaking', () => {
    expect(fitWithin(0, 0)).toEqual({ width: 1, height: 1 })
    expect(fitWithin(10000, 1)).toEqual({ width: 1568, height: 1 })
  })
})

describe('bytesToBase64', () => {
  it('matches the standard encoding, including padding and big inputs', () => {
    expect(bytesToBase64(new Uint8Array([65, 66, 67]))).toBe('QUJD')
    expect(bytesToBase64(new Uint8Array([65, 66]))).toBe('QUI=')
    expect(bytesToBase64(new Uint8Array([65]))).toBe('QQ==')
    const big = new Uint8Array(200_000).map((_, i) => i % 256)
    expect(bytesToBase64(big)).toBe(Buffer.from(big).toString('base64'))
  })
})

describe('createTutorApi (friendly failures)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('posts to the right route and returns the body', async () => {
    const post = vi.fn(async () => ({ ok: true, hint: 'What now?', source: 'ai', level: 1 }))
    const api = createTutorApi(post)
    const reply = await api.hint({ problem: SUB, stuck: true, level: 1 })
    expect(reply).toMatchObject({ ok: true, hint: 'What now?' })
    expect(post).toHaveBeenCalledWith('/api/tutor/hint', { problem: SUB, stuck: true, level: 1 })
    await createTutorApi(post).read({ text: 'x' })
    expect(post).toHaveBeenLastCalledWith('/api/tutor/read', { text: 'x' })
    await createTutorApi(post).explain({ problem: SUB, explanation: 'x' })
    expect(post).toHaveBeenLastCalledWith('/api/tutor/explain', { problem: SUB, explanation: 'x' })
  })

  it('keeps the tutor\'s own kind message from a failed request (rate limit, too large)', async () => {
    const error = Object.assign(new Error('429'), {
      response: { status: 429 },
      data: { ok: false, reason: 'rate_limited', message: 'Wow, lots of questions! Take a little break and try again soon.' },
    })
    const reply = await createTutorApi(async () => { throw error }).read({ text: 'x' })
    expect(reply).toEqual({ ok: false, reason: 'rate_limited', message: 'Wow, lots of questions! Take a little break and try again soon.' })
  })

  it('says "no internet" when the request never reached the server', async () => {
    const reply = await createTutorApi(async () => { throw new TypeError('Failed to fetch') }).hint({ problem: SUB, stuck: true, level: 1 })
    expect(reply).toEqual({ ok: false, reason: 'offline', message: OFFLINE_MESSAGE })
  })

  it('says "no internet" when the browser reports it is offline', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    const error = Object.assign(new Error('x'), { response: { status: 500 } })
    const reply = await createTutorApi(async () => { throw error }).explain({ problem: SUB, explanation: 'x' })
    expect(reply).toMatchObject({ ok: false, reason: 'offline' })
  })

  it('says the tutor is busy for a server error with no details', async () => {
    const error = Object.assign(new Error('boom'), { response: { status: 500 } })
    const reply = await createTutorApi(async () => { throw error }).read({ text: 'x' })
    expect(reply).toEqual({ ok: false, reason: 'unavailable', message: TROUBLE_MESSAGE })
  })

  it('never throws', async () => {
    const api = createTutorApi(async () => { throw 'weird' })
    await expect(api.read({ text: 'x' })).resolves.toMatchObject({ ok: false })
  })
})

describe('problemError (typed problems)', () => {
  it('accepts a good problem', () => {
    expect(problemError(SUB)).toBeNull()
    expect(problemError({ op: 'add', a: { whole: 0, num: 1, den: 2 }, b: { whole: 0, num: 1, den: 3 } })).toBeNull()
  })
  it('rejects a zero denominator and a subtraction that goes below zero', () => {
    expect(problemError({ op: 'add', a: { whole: 1, num: 1, den: 0 }, b: SUB.b })).toMatch(/zero/)
    expect(problemError({ op: 'subtract', a: SUB.b, b: SUB.a })).toMatch(/bigger number first/)
  })
  it('allows subtracting equal numbers', () => {
    expect(problemError({ op: 'subtract', a: SUB.a, b: SUB.a })).toBeNull()
  })
})

describe('hints made in the browser', () => {
  it('use the shared templates, aimed at the step the engine flagged', () => {
    expect(localHint(SUB, '3 11/20', false, 2)).toBe(LEVEL_HINTS.subtractNumerators[1])
    expect(localHint(SUB, undefined, true, 3)).toBe(LEVEL_HINTS.rename[2])
    expect(localHint(SUB, '3 11/20', false, 1)).toBe('Whole number looks good. Check the top numbers again?')
  })

  it('aim at the first step when she is stuck, and at the diagnosed step otherwise', () => {
    expect(hintTarget(SUB, '3 11/20', true).flaggedIndex).toBe(0)
    expect(hintTarget(SUB, '3 11/20', false).flaggedIndex).toBe(3)
    expect(hintTarget(SUB, 'banana', false).flaggedIndex).toBe(0)
  })

  it('never state the answer', () => {
    for (const level of [1, 2, 3] as const) {
      for (const answer of [undefined, '3 11/20', '12 19/20']) {
        expect(localHint(SUB, answer, false, level)).not.toMatch(/3 9\/20|69\/20/)
      }
    }
  })
})
