import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTutorStore } from '../app/stores/tutor'
import { OPERATION_WHY, SUCCESS_MESSAGES, WRONG_MESSAGES, opsPhrase } from '../app/utils/messages'
import { type AnyOp, type AnyProblem } from '../app/utils/fraction'
import { OPERATION_WORDS, operationHint, understandTemplate } from '../app/utils/tutorHints'
import type { TutorApi, UnderstandReply } from '../app/utils/tutorApi'
import { handleUnderstand, type TutorDeps } from '../server/utils/tutor/handlers'
import { createRateLimiter } from '../server/utils/tutor/rateLimit'
import { understandInputSchema } from '../server/utils/tutor/schemas'
import { MAX_UNDERSTAND_WORDS, generateUnderstanding, isSafeExplanation } from '../server/utils/tutor/understand'
import { fakeClient, sentText } from './tutor-helpers'

// "How many 3/4-cup scoops are in 6 cups?" is 6 ÷ 3/4 = 8
const SCOOPS: AnyProblem = { op: 'divide', a: { whole: 6, num: 0, den: 1 }, b: { whole: 0, num: 3, den: 4 } }
const SCOOPS_TEXT = 'How many 3/4-cup scoops are in 6 cups?'
const input = (problem: AnyProblem = SCOOPS, problemText: string | undefined = SCOOPS_TEXT) => ({ problem, problemText })

const GOOD = 'Imagine you have 6 cups. Think about how many scoops that hold 3/4 of a cup can fill them.'

describe('operation words', () => {
  it('catches the words that name an operation', () => {
    for (const word of ['add', 'adding', 'plus', 'sum', 'subtract', 'minus', 'difference', 'multiply', 'times', 'product', 'divide', 'dividing', 'division', 'operation']) {
      expect(OPERATION_WORDS.test(`We are ${word} here`), word).toBe(true)
    }
  })
  it('lets ordinary words through, including "additional" and numbers', () => {
    for (const text of [GOOD, 'Picture 6 cups of ice cream.', 'How much is left over?', 'Think about the scoops.']) {
      expect(OPERATION_WORDS.test(text), text).toBe(false)
    }
  })
})

describe('understandTemplate', () => {
  it('names neither the operation nor the answer, for every operation', () => {
    for (const op of ['add', 'subtract', 'multiply', 'divide'] as AnyOp[]) {
      const problem = { op, a: { whole: 6, num: 0, den: 1 }, b: { whole: 0, num: 3, den: 4 } } as AnyProblem
      for (const text of [understandTemplate(problem), understandTemplate(problem, SCOOPS_TEXT)]) {
        expect(OPERATION_WORDS.test(text), `${op}: ${text}`).toBe(false)
        expect(text).not.toMatch(/\b8\b|\b4 1\/2\b|\b6 3\/4\b/)
      }
    }
  })
  it('uses her own words when there are some, and the numbers when there are not', () => {
    expect(understandTemplate(SCOOPS, SCOOPS_TEXT)).toContain(SCOOPS_TEXT)
    expect(understandTemplate(SCOOPS)).toBe('You have two numbers: 6 and 3/4. Picture them. What is the problem asking you to do with them?')
  })
})

describe('operationHint', () => {
  it('multiplying answered by adding: repeated addition', () => {
    expect(operationHint('add', 'multiply')).toBe('Multiplying is repeated adding. How many times should you add it?')
  })
  it('multiplying or dividing, anything else: part of it or splitting it up', () => {
    expect(operationHint('subtract', 'multiply')).toBe('Are we taking a part of it, or splitting it up?')
    expect(operationHint('multiply', 'divide')).toBe('Are we taking a part of it, or splitting it up?')
    expect(operationHint('add', 'divide')).toBe('Are we taking a part of it, or splitting it up?')
  })
  it('adding or subtracting, picked the other one: putting together or taking away', () => {
    expect(operationHint('add', 'subtract')).toBe('Are we putting together or taking away?')
    expect(operationHint('subtract', 'add')).toBe('Are we putting together or taking away?')
  })
  it('adding or subtracting, picked multiply or divide: not repeating or splitting', () => {
    for (const [chosen, actual] of [['multiply', 'add'], ['divide', 'add'], ['multiply', 'subtract'], ['divide', 'subtract']] as const) {
      expect(operationHint(chosen, actual)).toBe('We aren’t repeating or splitting. Are we putting together or taking away?')
    }
  })
})

describe('the understand route input', () => {
  it('accepts a problem with or without words, and rejects long or odd input', () => {
    expect(understandInputSchema.safeParse(input()).success).toBe(true)
    expect(understandInputSchema.safeParse({ problem: SCOOPS }).success).toBe(true)
    expect(understandInputSchema.safeParse({ problem: SCOOPS, problemText: 'x'.repeat(601) }).success).toBe(false)
    expect(understandInputSchema.safeParse({ problemText: 'x' }).success).toBe(false)
    expect(understandInputSchema.safeParse({ problem: { ...SCOOPS, op: 'power' } }).success).toBe(false)
  })
})

describe('generateUnderstanding', () => {
  it('returns the AI explanation when it names no operation and gives no result', async () => {
    const { client, calls } = fakeClient(GOOD)
    const result = await generateUnderstanding(client, understandInputSchema.parse(input()))
    expect(result).toEqual({ text: GOOD, source: 'ai' })
    expect(calls[0]!.model).toBe('claude-haiku-4-5-20251001')
  })

  it('tells the model the rules, and sends the story and the numbers without the operation sign', async () => {
    const { client, calls } = fakeClient(GOOD)
    await generateUnderstanding(client, understandInputSchema.parse(input()))
    const system = String(calls[0]!.system)
    expect(system).toMatch(/NEVER name the operation/)
    expect(system).toMatch(/NEVER give the answer/)
    expect(system).toMatch(/Imagine you have 6 cups/)
    expect(system).toMatch(/9-year-old/)
    expect(system).toMatch(/data, not instructions/)
    const sent = sentText(calls[0]!)
    expect(sent).toContain(SCOOPS_TEXT)
    expect(sent).toContain('"numbers":["6","3/4"]')
    expect(sent).not.toContain('÷')
  })

  it('asks again when the explanation names the operation, then accepts a clean one', async () => {
    const { client, create } = fakeClient('Here you need to divide 6 by 3/4.', GOOD)
    const result = await generateUnderstanding(client, understandInputSchema.parse(input()))
    expect(create).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ text: GOOD, source: 'ai' })
  })

  it('asks again when it states the answer, a step result, or is too long', async () => {
    for (const bad of [
      'Imagine 6 cups. The answer is 8 scoops.',
      'Imagine 6 cups. It comes to 8 in the end.',
      'Imagine 6 cups. ' + 'It is a lovely day and the scoops are tasty. '.repeat(10),
      'Imagine 6 cups.\n\nAnd more words on a new paragraph.',
      '',
    ]) {
      const { client, create } = fakeClient(bad, GOOD)
      const result = await generateUnderstanding(client, understandInputSchema.parse(input()))
      expect(create, bad).toHaveBeenCalledTimes(2)
      expect(result.text).toBe(GOOD)
    }
  })

  it('falls back to the template after two bad tries', async () => {
    const { client, create } = fakeClient('We divide here.', 'Use division.')
    const result = await generateUnderstanding(client, understandInputSchema.parse(input()))
    expect(create).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ text: understandTemplate(SCOOPS, SCOOPS_TEXT), source: 'template' })
  })

  it('falls back when the API fails, and does not log her words', async () => {
    const { client } = fakeClient(Object.assign(new Error('failed: 3/4-cup scoops'), { status: 500 }))
    const result = await generateUnderstanding(client, understandInputSchema.parse(input()))
    expect(result.source).toBe('template')
  })

  it('does not call the AI for typed numbers (there is no story to explain), or with no key', async () => {
    const { client, create } = fakeClient(GOOD)
    const typed = await generateUnderstanding(client, understandInputSchema.parse({ problem: SCOOPS }))
    expect(create).not.toHaveBeenCalled()
    expect(typed.source).toBe('template')
    const none = await generateUnderstanding(null, understandInputSchema.parse(input()))
    expect(none.source).toBe('template')
  })

  it('does not wait longer than the time limit', async () => {
    const { client } = fakeClient(() => new Promise<never>(() => {}))
    const started = Date.now()
    const result = await generateUnderstanding(client, understandInputSchema.parse(input()), { timeoutMs: 50 })
    expect(Date.now() - started).toBeLessThan(1000)
    expect(result.source).toBe('template')
  })

  it('removes personal details from her words before sending them', async () => {
    const { client, calls } = fakeClient(GOOD)
    await generateUnderstanding(client, understandInputSchema.parse(input(SCOOPS, 'Hi Sam, my number is 555-123-4567. How many 3/4-cup scoops are in 6 cups?')))
    const sent = sentText(calls[0]!)
    expect(sent).not.toContain('Sam')
    expect(sent).not.toContain('555-123-4567')
  })

  it('isSafeExplanation: a short picture of the situation is fine; a number that is only in the problem is fine', () => {
    const parsed = understandInputSchema.parse(input())
    expect(isSafeExplanation(GOOD, parsed)).toBe(true)
    expect(isSafeExplanation('Picture 6 cups and a scoop that holds 3/4 of a cup.', parsed)).toBe(true)
    expect(isSafeExplanation('x '.repeat(MAX_UNDERSTAND_WORDS + 1), parsed)).toBe(false)
  })
})

describe('the understand route handler', () => {
  const deps = (over: Partial<TutorDeps> = {}): TutorDeps => ({ client: null, demo: false, limiter: createRateLimiter(), ip: '7.7.7.7', ...over })

  it('returns a plain explanation with no key, and the AI one with a key', async () => {
    const res = await handleUnderstand(input(), deps())
    expect(res.body).toMatchObject({ ok: true, source: 'template' })
    const { client } = fakeClient(GOOD)
    const ai = await handleUnderstand(input(), deps({ client }))
    expect(ai.body).toMatchObject({ ok: true, text: GOOD, source: 'ai' })
  })

  it('DEMO_MODE returns a canned explanation and never calls the API', async () => {
    const { client, create } = fakeClient(GOOD)
    const res = await handleUnderstand(input(), deps({ client, demo: true }))
    expect(res.body).toMatchObject({ ok: true, source: 'demo' })
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects bad input with a kind message, and is limited like the other routes', async () => {
    expect((await handleUnderstand({}, deps())).status).toBe(400)
    const blocked = await handleUnderstand(input(), deps({ limiter: createRateLimiter({ limit: 0, windowMs: 1000 }) }))
    expect(blocked.status).toBe(429)
  })
})

// ---- the Tutor store: understand step and acknowledgement ----

function api(over: Partial<TutorApi> = {}): TutorApi {
  return {
    read: async () => ({ ok: true, problem: SCOOPS, operands: ['6', '3/4'], problemText: SCOOPS_TEXT, confidence: 'high' }),
    understand: async () => ({ ok: true, text: GOOD, source: 'ai' }),
    hint: async ({ level }) => ({ ok: true, hint: `Hint ${level}?`, source: 'ai', level }),
    ...over,
  }
}

async function atUnderstand(a: TutorApi = api()) {
  const store = useTutorStore()
  store.setApi(a)
  await store.readProblem({ text: SCOOPS_TEXT })
  // The explanation is only fetched when she asks for it.
  await store.explainQuestion()
  return store
}

describe('the Tutor "understand" step', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('after "Yes" she understands the question before she solves it', async () => {
    const store = await atUnderstand()
    expect(store.state).toBe('understand')
    expect(store.understanding.text).toBe(GOOD)
    expect(store.understanding.source).toBe('ai')
    expect(await store.submitAnswer('8')).toBeNull() // not yet
  })

  it('makes no AI call until she asks, then only one', async () => {
    const store = useTutorStore()
    const understand = vi.fn(async () => ({ ok: true as const, text: GOOD, source: 'ai' }))
    store.setApi(api({ understand }))
    await store.readProblem({ text: SCOOPS_TEXT })
    expect(understand).not.toHaveBeenCalled()
    expect(store.understanding.text).toBe('')
    await store.explainQuestion()
    await store.explainQuestion() // asking again does not call again
    expect(understand).toHaveBeenCalledTimes(1)
    expect(store.understanding.text).toBe(GOOD)
  })

  it('shows "Thinking" while the explanation is on its way', async () => {
    const store = useTutorStore()
    let release: (r: UnderstandReply) => void = () => {}
    store.setApi(api({ understand: () => new Promise((resolve) => (release = resolve)) }))
    await store.readProblem({ text: SCOOPS_TEXT })
    store.explainQuestion()
    expect(store.understanding.loading).toBe(true)
    expect(store.busy).toBeNull() // she can still choose the operation and answer meanwhile
    release({ ok: true, text: GOOD, source: 'ai' })
    await store.whenUnderstood()
    expect(store.understanding.loading).toBe(false)
    expect(store.understanding.text).toBe(GOOD)
  })

  it('uses a plain explanation when the tutor can not be reached', async () => {
    const store = await atUnderstand(api({ understand: async () => ({ ok: false, reason: 'offline', message: 'No internet.' }) }))
    expect(store.understanding.source).toBe('template')
    expect(store.understanding.text).toBe(understandTemplate(SCOOPS, SCOOPS_TEXT))
  })

  it('typed numbers get the plain explanation without calling the tutor', async () => {
    const store = useTutorStore()
    const a = api()
    let calls = 0
    a.understand = async () => {
      calls++
      return { ok: true, text: GOOD, source: 'ai' }
    }
    store.setApi(a)
    expect(store.enterTyped(SCOOPS)).toBeNull()
    expect(store.state).toBe('confirm') // typed numbers skip this step entirely
    store.confirmProblem()
    await store.whenUnderstood()
    expect(calls).toBe(0)
    expect(store.state).toBe('attempt')
    expect(understandTemplate(SCOOPS)).toBe('You have two numbers: 6 and 3/4. Picture them. What is the problem asking you to do with them?')
  })

  it('the right operation is acknowledged with encouragement and the reason', async () => {
    const store = await atUnderstand()
    expect(store.chooseOperation('divide')).toBe('correct')
    expect(store.understanding.done).toBe(true)
    const praise = store.understanding.message
    expect(SUCCESS_MESSAGES.some((m) => praise.startsWith(m))).toBe(true)
    expect(praise).toContain(OPERATION_WHY.divide)
    expect(store.continueFromUnderstanding()).toBe(true)
    expect(store.state).toBe('confirm') // now she sees the whole problem and confirms it
  })

  it('a wrong operation gets a hint question, not the answer', async () => {
    const store = await atUnderstand()
    expect(store.chooseOperation('multiply')).toBe('wrong')
    expect(store.understanding.done).toBe(false)
    expect(WRONG_MESSAGES.some((m) => store.understanding.message.startsWith(m))).toBe(true)
    expect(store.understanding.message).toContain('Are we taking a part of it, or splitting it up?')
    expect(store.continueFromUnderstanding()).toBe(false)
    expect(store.state).toBe('understand')
  })

  it('multiplying answered by adding gets the repeated-addition hint', async () => {
    setActivePinia(createPinia())
    const times: AnyProblem = { op: 'multiply', a: { whole: 0, num: 2, den: 3 }, b: { whole: 12, num: 0, den: 1 } }
    const store = await atUnderstand(api({ read: async () => ({ ok: true, problem: times, operands: ['', ''], problemText: '2/3 of 12', confidence: 'high' }) }))
    store.chooseOperation('add')
    expect(store.understanding.message).toContain('Multiplying is repeated adding. How many times should you add it?')
  })

  it('after two wrong choices the tutor says which operation it is, so she is never stuck', async () => {
    const store = await atUnderstand()
    store.chooseOperation('add')
    store.chooseOperation('subtract')
    expect(store.understanding.done).toBe(true)
    expect(store.understanding.revealed).toBe(true)
    expect(store.understanding.message).toBe(`This one needs dividing. ${OPERATION_WHY.divide}`)
    expect(store.continueFromUnderstanding()).toBe(true)
  })

  it('does nothing once she has the operation, or outside this step', async () => {
    const store = await atUnderstand()
    store.chooseOperation('divide')
    expect(store.chooseOperation('add')).toBeNull()
    store.continueFromUnderstanding()
    expect(store.chooseOperation('divide')).toBeNull()
    setActivePinia(createPinia())
    expect(useTutorStore().chooseOperation('divide')).toBeNull()
  })

  it('a late explanation for a problem she has already left is ignored', async () => {
    const store = useTutorStore()
    let release: (r: UnderstandReply) => void = () => {}
    store.setApi(api({ understand: () => new Promise((resolve) => (release = resolve)) }))
    await store.readProblem({ text: SCOOPS_TEXT })
    store.explainQuestion()
    store.reset() // she started over before the explanation arrived
    release({ ok: true, text: GOOD, source: 'ai' })
    await store.whenUnderstood().catch(() => {})
    expect(store.state).toBe('capture')
    expect(store.understanding.text).toBe('')
  })

  it('reset clears everything about this step', async () => {
    const store = await atUnderstand()
    store.chooseOperation('divide')
    store.reset()
    expect(store.understanding).toEqual({ text: '', source: '', loading: false, wrong: 0, choice: null, message: '', done: false, revealed: false })
  })
})

describe('the Tutor acknowledges her answer', () => {
  beforeEach(() => setActivePinia(createPinia()))

  async function atAttempt() {
    const store = await atUnderstand()
    store.chooseOperation('divide')
    store.continueFromUnderstanding()
    store.confirmProblem()
    return store
  }

  it('she can answer while the explanation is still loading', async () => {
    const store = useTutorStore()
    store.setApi(api({ understand: () => new Promise(() => {}) }))
    await store.readProblem({ text: SCOOPS_TEXT })
    store.chooseOperation('divide')
    store.continueFromUnderstanding()
    store.confirmProblem()
    expect(await store.submitAnswer('8')).toBe('correct')
  })

  it('a correct answer gets a short, varied success line', async () => {
    const store = await atAttempt()
    expect(await store.submitAnswer('8')).toBe('correct')
    expect(SUCCESS_MESSAGES).toContain(store.successMessage)
    expect(store.state).toBe('check')
  })

  it('never repeats the same success line twice in a row across problems', async () => {
    const seen: string[] = []
    const store = useTutorStore()
    store.setApi(api())
    for (let i = 0; i < 10; i++) {
      store.reset()
      await store.readProblem({ text: SCOOPS_TEXT })
      store.chooseOperation('divide')
      store.continueFromUnderstanding()
      store.confirmProblem()
      await store.submitAnswer('8')
      seen.push(store.successMessage)
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
  })

  it('a wrong answer says so kindly and a hint follows, like Practice', async () => {
    const store = await atAttempt()
    expect(await store.submitAnswer('7')).toBe('wrong')
    expect(WRONG_MESSAGES).toContain(store.wrongMessage)
    expect(store.state).toBe('hint1')
    expect(store.successMessage).toBe('')
  })
})

describe('opsPhrase (real-world question)', () => {
  it('names only the operations she practiced', () => {
    expect(opsPhrase(['multiply'])).toBe('multiplying')
    expect(opsPhrase(['divide'])).toBe('dividing')
    expect(opsPhrase(['add', 'subtract'])).toBe('adding and subtracting')
    expect(opsPhrase(['multiply', 'divide'])).toBe('multiplying and dividing')
    expect(opsPhrase(['add', 'subtract', 'multiply', 'divide'])).toBe('adding, subtracting, multiplying and dividing')
    expect(opsPhrase(['divide', 'add'])).toBe('adding and dividing')
  })
  it('falls back to all four when there are none', () => {
    expect(opsPhrase([])).toBe('adding, subtracting, multiplying and dividing')
  })
})
