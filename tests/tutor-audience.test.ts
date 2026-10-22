import { describe, expect, it } from 'vitest'
import { DEMO_PROBLEM, isRealFamilyUser, useDemoAnswers, type VerifiedClaims } from '../server/utils/tutor/demo'
import { handleExplain, handleHint, handleRead, handleUnderstand, type TutorDeps } from '../server/utils/tutor/handlers'
import { createRateLimiter } from '../server/utils/tutor/rateLimit'
import { SUB, fakeClient } from './tutor-helpers'

const REAL: VerifiedClaims = { sub: 'user-1', role: 'authenticated', is_anonymous: false }
const DEMO_USER: VerifiedClaims = { sub: 'user-2', role: 'authenticated', is_anonymous: true }

describe('who gets the real AI', () => {
  it('only a signed-in, non-anonymous account counts as a real family account', () => {
    expect(isRealFamilyUser(REAL)).toBe(true)
    expect(isRealFamilyUser(DEMO_USER)).toBe(false)
    expect(isRealFamilyUser(null)).toBe(false)
    expect(isRealFamilyUser(undefined)).toBe(false)
    expect(isRealFamilyUser({})).toBe(false)
    expect(isRealFamilyUser({ sub: 'u', role: 'authenticated' })).toBe(false) // is_anonymous missing
    expect(isRealFamilyUser({ sub: 'u', role: 'anon', is_anonymous: false })).toBe(false)
    expect(isRealFamilyUser({ sub: '', role: 'authenticated', is_anonymous: false })).toBe(false)
    expect(isRealFamilyUser({ sub: 'u', role: 'authenticated', is_anonymous: 'false' })).toBe(false)
  })

  it('demo answers for DEMO_MODE, no user, an anonymous user, and any error; the real AI for a real account', async () => {
    expect(await useDemoAnswers({ env: { DEMO_MODE: 'true' }, readClaims: async () => REAL })).toBe(true)
    expect(await useDemoAnswers({ env: {}, readClaims: async () => null })).toBe(true)
    expect(await useDemoAnswers({ env: {}, readClaims: async () => DEMO_USER })).toBe(true)
    expect(await useDemoAnswers({ env: {}, readClaims: async () => { throw new Error('bad token') } })).toBe(true)
    expect(await useDemoAnswers({ env: {}, readClaims: async () => REAL })).toBe(false)
  })

  it('the emergency switch does not even read the token', async () => {
    let reads = 0
    await useDemoAnswers({ env: { DEMO_MODE: '1' }, readClaims: async () => (reads++, REAL) })
    expect(reads).toBe(0)
  })
})

describe('the routes follow that decision', () => {
  const claimsFor = {
    'a signed-out visitor': null,
    'a demo (anonymous) user': DEMO_USER,
    'DEMO_MODE=true': REAL,
  } as const

  for (const [who, claims] of Object.entries(claimsFor)) {
    it(`${who}: canned answers on all four routes and zero AI calls`, async () => {
      const { client, create } = fakeClient('this must never be used')
      const demo = await useDemoAnswers({ env: who === 'DEMO_MODE=true' ? { DEMO_MODE: 'true' } : {}, readClaims: async () => claims })
      expect(demo).toBe(true)
      // The route hands the AI client over only when demo is false; a test that gave it one anyway must still see no call.
      const deps: TutorDeps = { client, demo, limiter: createRateLimiter(), ip: '1.1.1.1' }

      const read = await handleRead({ text: 'anything' }, deps)
      expect(read.body).toMatchObject({ ok: true, problem: DEMO_PROBLEM })
      expect((await handleHint({ problem: SUB, studentAnswer: '3 11/20', stuck: false, level: 1 }, deps)).body).toMatchObject({ ok: true, source: 'demo' })
      expect((await handleExplain({ problem: SUB, explanation: 'I matched the bottoms' }, deps)).body).toMatchObject({ source: 'demo' })
      expect((await handleUnderstand({ problem: SUB, problemText: 'A story about buckets.' }, deps)).body).toMatchObject({ ok: true, source: 'demo' })
      expect(create).not.toHaveBeenCalled()
    })
  }

  it('a real family account reaches the AI client', async () => {
    const { client, create } = fakeClient('{"verdict":"clear","praise":"Nice."}', 'What do the bottoms need to be?')
    const demo = await useDemoAnswers({ env: {}, readClaims: async () => REAL })
    expect(demo).toBe(false)
    const deps: TutorDeps = { client, demo, limiter: createRateLimiter(), ip: '2.2.2.2' }
    await handleHint({ problem: SUB, studentAnswer: '3 11/20', stuck: false, level: 1 }, deps)
    expect(create).toHaveBeenCalled()
  })
})
