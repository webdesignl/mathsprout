import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTutorStore } from '../app/stores/tutor'
import { formatMixed, problemAnswer, toMixed } from '../app/utils/fraction'
import { resolvePlan, similarPlan, type Plan } from '../app/utils/plan'
import type { ReadReply, TutorApi } from '../app/utils/tutorApi'
import { readProblem, safeLabel } from '../server/utils/tutor/read'
import { handleRead } from '../server/utils/tutor/handlers'
import { createRateLimiter } from '../server/utils/tutor/rateLimit'
import { fakeClient } from './tutor-helpers'

/** Original problem: 1/5 did not finish; 5/6 of the finishers were adults; 1/4 of those who did not finish were children. */
const MARATHON: Plan = {
  steps: [
    { op: 'subtract', a: '1', b: '1/5', label: 'What fraction of the people finished?' },
    { op: 'multiply', a: 'r1', b: '1/6', label: 'What fraction of everyone finished and was a child?' },
    { op: 'multiply', a: '1/4', b: '1/5', label: 'What fraction of everyone did not finish and was a child?' },
    { op: 'add', a: 'r2', b: 'r3', label: 'What fraction of everyone was a child?' },
  ],
}
const modelJson = (plan: Plan) => JSON.stringify({ ...plan, problemText: 'A race story.', confidence: 'high' })

describe('resolvePlan (the engine checks every step)', () => {
  it('works out the marathon chain: 4/5, 2/15, 1/20 and 11/60', () => {
    const check = resolvePlan(MARATHON)
    expect(check.ok).toBe(true)
    if (!check.ok) return
    expect(check.results.map((r) => formatMixed(r))).toEqual(['4/5', '2/15', '1/20', '11/60'])
  })

  it('rejects bad plans', () => {
    const one = MARATHON.steps[0]!
    expect(resolvePlan({ steps: [one] })).toEqual({ ok: false, reason: 'steps' })
    expect(resolvePlan({ steps: [...MARATHON.steps, ...MARATHON.steps] })).toEqual({ ok: false, reason: 'steps' })
    expect(resolvePlan({ steps: [one, { ...one, a: 'r2' }] })).toEqual({ ok: false, reason: 'reference' })
    expect(resolvePlan({ steps: [{ ...one, a: 'x' }, one] })).toEqual({ ok: false, reason: 'operand' })
    expect(resolvePlan({ steps: [{ ...one, a: '1/5', b: '1' }, { ...one, op: 'add', a: 'r1', b: '1/2' }] })).toEqual({ ok: false, reason: 'negative' })
    expect(resolvePlan({ steps: [{ ...one, op: 'divide', a: '1', b: '0' }, { ...one, op: 'add', a: 'r1', b: '1' }] })).toEqual({ ok: false, reason: 'zeroDivisor' })
    // Step 1 is never used.
    expect(resolvePlan({ steps: [one, { ...one, a: '1', b: '1/2' }] })).toEqual({ ok: false, reason: 'unused' })
  })
})

describe('reading a multi-step problem', () => {
  it('returns the plan once the engine has checked it', async () => {
    const { client } = fakeClient(modelJson(MARATHON))
    const result = await readProblem(client, { text: 'x' })
    expect(result).toMatchObject({ ok: true, plan: { steps: [{ op: 'subtract' }, {}, {}, {}] } })
  })

  it('asks again when a plan does not add up, and uses the second reply', async () => {
    const bad: Plan = { steps: [MARATHON.steps[0]!, { op: 'add', a: '1/2', b: '1/3', label: 'Next?' }] }
    const { client, create } = fakeClient(modelJson(bad), modelJson(MARATHON))
    expect(await readProblem(client, { text: 'x' })).toMatchObject({ ok: true, plan: { steps: [{}, {}, {}, {}] } })
    expect(create).toHaveBeenCalledTimes(2)
  })

  it('gives up kindly when the plan is still wrong the second time', async () => {
    const bad: Plan = { steps: [MARATHON.steps[0]!, { op: 'add', a: '1/2', b: '1/3', label: 'Next?' }] }
    const { client } = fakeClient(modelJson(bad))
    expect(await readProblem(client, { text: 'x' })).toMatchObject({ ok: false, reason: 'unreadable' })
  })

  it('replaces a label that names an operation or holds a number', () => {
    expect(safeLabel('What fraction finished?', 0)).toBe('What fraction finished?')
    expect(safeLabel('Subtract 1/5 from the whole', 1)).toBe('What do you need to find in step 2?')
    expect(safeLabel('Multiply the fractions', 0)).toBe('What do you need to find in step 1?')
    expect(safeLabel('', 2)).toBe('What do you need to find in step 3?')
  })

  it('works through the route handler', async () => {
    const { client } = fakeClient(modelJson(MARATHON))
    const res = await handleRead({ text: 'x' }, { client, demo: false, limiter: createRateLimiter(), ip: '1.1.1.1' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true, plan: { steps: expect.any(Array) } })
  })
})

function fakeApi(plan: Plan = MARATHON) {
  const read: ReadReply = { ok: true, plan, problemText: 'A race story.', confidence: 'high' }
  const api: TutorApi = {
    read: vi.fn(async () => read),
    understand: vi.fn(async () => ({ ok: true as const, text: 'unused', source: 'ai' })),
    hint: vi.fn(async ({ level }) => ({ ok: true as const, hint: `Hint ${level}, what do you notice?`, source: 'ai', level })),
    explain: vi.fn(async () => ({ ok: true as const, verdict: 'clear' as const, praise: 'Good.', source: 'ai' })),
  }
  return api
}

describe('the Tutor works through a multi-step problem', () => {
  beforeEach(() => setActivePinia(createPinia()))

  async function start() {
    const store = useTutorStore()
    const api = fakeApi()
    store.setApi(api)
    await store.readProblem({ text: 'x' })
    return { store, api }
  }

  it('confirms the whole problem, then asks for the operation on step 1 with the step question', async () => {
    const { store, api } = await start()
    expect(store.state).toBe('confirm')
    expect(store.plan?.steps).toHaveLength(4)
    store.confirmProblem()
    expect(store.state).toBe('understand')
    expect(store.stepIndex).toBe(0)
    expect(store.understanding.text).toBe('What fraction of the people finished?')
    // No AI call to explain a step: the plan's question is used.
    expect(api.understand).not.toHaveBeenCalled()
    expect(store.doesNotLookRight()).toBe(false)
  })

  it('carries each answer into the next step and finishes with 11/60', async () => {
    const { store } = await start()
    store.confirmProblem()
    const answers = ['4/5', '2/15', '1/20', '11/60']
    const operands = ['1 − 1/5', '4/5 × 1/6', '1/4 × 1/5', '2/15 + 1/20']
    for (let i = 0; i < 4; i++) {
      expect(store.stepIndex).toBe(i)
      const p = store.problem!
      expect(`${formatMixed(p.a)} ${p.op === 'subtract' ? '−' : p.op === 'multiply' ? '×' : '+'} ${formatMixed(p.b)}`).toBe(operands[i])
      expect(store.chooseOperation(p.op)).toBe('correct')
      store.continueFromUnderstanding()
      expect(store.state).toBe('attempt')
      expect(await store.submitAnswer(answers[i]!)).toBe('correct')
      expect(store.state).toBe('stepDone')
      store.nextStep()
    }
    expect(store.state).toBe('similar')
    expect(store.mainSteps.map((s) => s.answer)).toEqual(answers)
  })

  it('offers a similar problem with new numbers, solved the same way, then finishes', async () => {
    const { store } = await start()
    store.confirmProblem()
    for (const [op, answer] of [['subtract', '4/5'], ['multiply', '2/15'], ['multiply', '1/20'], ['add', '11/60']] as const) {
      store.chooseOperation(op)
      store.continueFromUnderstanding()
      await store.submitAnswer(answer)
      store.nextStep()
    }
    expect(store.state).toBe('similar')
    expect(store.startSimilar(seeded(7))).toBe(true)
    expect(store.inSimilar).toBe(true)
    expect(store.state).toBe('understand')
    expect(store.stepLabel).toBe(MARATHON.steps[0]!.label)
    // The engine knows the answers; she solves each step again.
    while (store.state !== 'done') {
      store.chooseOperation(store.problem!.op)
      store.continueFromUnderstanding()
      const right = formatMixed(toMixed(problemAnswer(store.problem!)!))
      expect(await store.submitAnswer(right)).toBe('correct')
      store.nextStep()
    }
    expect(store.mainSteps.at(-1)!.answer).toBe('11/60')
    expect(store.finishedSteps).toHaveLength(4)
  })

  it('she can skip the similar problem', async () => {
    const { store } = await start()
    store.confirmProblem()
    for (const [op, answer] of [['subtract', '4/5'], ['multiply', '2/15'], ['multiply', '1/20'], ['add', '11/60']] as const) {
      store.chooseOperation(op)
      store.continueFromUnderstanding()
      await store.submitAnswer(answer)
      store.nextStep()
    }
    expect(store.skipSimilar()).toBe(true)
    expect(store.state).toBe('done')
  })

  it('a wrong step answer climbs the hint ladder for that step and is counted', async () => {
    const { store, api } = await start()
    store.confirmProblem()
    store.chooseOperation('subtract')
    store.continueFromUnderstanding()
    expect(await store.submitAnswer('1/5')).toBe('wrong')
    expect(store.state).toBe('hint1')
    expect(api.hint).toHaveBeenCalledWith(expect.objectContaining({ problem: store.problem }))
    expect(await store.submitAnswer('4/5')).toBe('correct')
    store.nextStep()
    store.chooseOperation('multiply')
    store.continueFromUnderstanding()
    expect(await store.submitAnswer('4/30')).toBe('correctNotSimplest')
    expect(await store.submitAnswer('2/15')).toBe('correct')
    store.nextStep()
    store.chooseOperation('multiply')
    store.continueFromUnderstanding()
    await store.submitAnswer('1/20')
    store.nextStep()
    store.chooseOperation('add')
    store.continueFromUnderstanding()
    await store.submitAnswer('11/60')
    store.nextStep()
    expect(store.state).toBe('similar')
    expect(store.planTotals).toEqual({ attempts: 6, hints: 1 })
  })

  it('"Solve another" clears the plan', async () => {
    const { store } = await start()
    store.confirmProblem()
    store.reset()
    expect(store.plan).toBeNull()
    expect(store.finishedSteps).toEqual([])
    expect(store.state).toBe('capture')
  })

  it('a plan the engine rejects never starts', async () => {
    const store = useTutorStore()
    const bad: Plan = { steps: [MARATHON.steps[0]!, { op: 'add', a: '1/2', b: '1/3', label: 'Next?' }] }
    store.setApi(fakeApi(bad))
    expect(await store.readProblem({ text: 'x' })).toBe(false)
    expect(store.state).toBe('capture')
    expect(store.error).toBeTruthy()
  })
})

function seeded(seed: number) {
  let x = seed
  return () => {
    x = (x * 1664525 + 1013904223) % 4294967296
    return x / 4294967296
  }
}

describe('similarPlan', () => {
  it('keeps the steps and swaps the fractions, and the engine accepts it', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const next = similarPlan(MARATHON, seeded(seed))!
      expect(next).not.toBeNull()
      expect(resolvePlan(next).ok).toBe(true)
      expect(next.steps.map((s) => s.op)).toEqual(MARATHON.steps.map((s) => s.op))
      expect(next.steps[0]!.a).toBe('1')
      expect(next.steps[1]!.a).toBe('r1')
      expect(next.steps[3]!.a).toBe('r2')
      expect(next).not.toEqual(MARATHON)
    }
  })

  it('returns null when nothing can be swapped', () => {
    const fixed: Plan = { steps: [{ op: 'add', a: '2', b: '3', label: 'First?' }, { op: 'add', a: 'r1', b: '1', label: 'Then?' }] }
    expect(similarPlan(fixed, seeded(1))).toBeNull()
  })
})
