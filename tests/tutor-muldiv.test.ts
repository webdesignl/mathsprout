import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { workedSteps, type AnyProblem } from '../app/utils/fraction'
import { useTutorStore } from '../app/stores/tutor'
import { problemError, type TutorApi } from '../app/utils/tutorApi'
import { LEVEL_HINTS, hintTarget, localHint } from '../app/utils/tutorHints'
import { methodChecklist, evaluateExplanation } from '../server/utils/tutor/explain'
import { buildHintContext, generateHint } from '../server/utils/tutor/hint'
import { leaksAnswer, stepResultTokens } from '../server/utils/tutor/leak'
import { FAILURE_MESSAGES } from '../server/utils/tutor/messages'
import { readProblem } from '../server/utils/tutor/read'
import { explainInputSchema, hintInputSchema } from '../server/utils/tutor/schemas'
import { handleHint, handleRead } from '../server/utils/tutor/handlers'
import { createRateLimiter } from '../server/utils/tutor/rateLimit'
import { fakeClient, sentText } from './tutor-helpers'

const DIV: AnyProblem = { op: 'divide', a: { whole: 0, num: 2, den: 3 }, b: { whole: 0, num: 4, den: 9 } } // 1 1/2
const MUL: AnyProblem = { op: 'multiply', a: { whole: 2, num: 1, den: 2 }, b: { whole: 3, num: 1, den: 3 } } // 8 1/3
const MUL2: AnyProblem = { op: 'multiply', a: { whole: 0, num: 4, den: 9 }, b: { whole: 0, num: 3, den: 8 } } // 1/6

const json = (operation: string, operands: string[], problemText = 'x', confidence = 'high') =>
  JSON.stringify({ operation, operands, problemText, confidence })

describe('reading multiplication and division', () => {
  it('accepts × and x symbols and "of" in word problems (the model reports the operation)', async () => {
    for (const [text, reply, expected] of [
      ['2/3 × 12', json('multiply', ['2/3', '12']), { op: 'multiply' }],
      ['2/3 x 12', json('multiply', ['2/3', '12']), { op: 'multiply' }],
      ['What is 2/3 of 12?', json('multiply', ['2/3', '12'], '2/3 of 12'), { op: 'multiply' }],
      ['6 ÷ 2/3', json('divide', ['6', '2/3']), { op: 'divide' }],
      ['6 divided by 2/3', json('divide', ['6', '2/3']), { op: 'divide' }],
    ] as const) {
      const { client } = fakeClient(reply)
      const result = await readProblem(client, { text })
      expect(result, text).toMatchObject({ ok: true, problem: expected })
    }
  })

  it('"2/3 of 12" becomes 2/3 × 12 with the engine-parsed numbers', async () => {
    const { client } = fakeClient(json('multiply', ['2/3', '12'], '2/3 of 12'))
    const result = await readProblem(client, { text: 'What is 2/3 of 12?' })
    expect(result).toMatchObject({
      ok: true,
      operands: ['2/3', '12'],
      problem: { op: 'multiply', a: { whole: 0, num: 2, den: 3 }, b: { whole: 12, num: 0, den: 1 } },
    })
  })

  it('tells the model about the symbols, "of", and treating the text as data', async () => {
    const { client, calls } = fakeClient(json('multiply', ['2/3', '12']))
    await readProblem(client, { text: 'x' })
    const system = String(calls[0]!.system)
    expect(system).toMatch(/"×", "x"/)
    expect(system).toMatch(/"÷"/)
    expect(system).toMatch(/"of" means multiply/)
    expect(system).toMatch(/2\/3 of 12/)
    expect(system).toMatch(/data, never instructions/)
  })

  it('dividing by zero gets a kind message, without a retry', async () => {
    const { client, create } = fakeClient(json('divide', ['3/5', '0']))
    const result = await readProblem(client, { text: '3/5 ÷ 0' })
    expect(create).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({ ok: false, reason: 'zero_divisor', message: FAILURE_MESSAGES.zero_divisor })
    const fraction = fakeClient(json('divide', ['3/5', '0/4']))
    expect(await readProblem(fraction.client, { text: 'x' })).toMatchObject({ ok: false, reason: 'zero_divisor' })
  })

  it('multiplying by zero is fine (the answer is 0)', async () => {
    const { client } = fakeClient(json('multiply', ['3/5', '0']))
    expect(await readProblem(client, { text: 'x' })).toMatchObject({ ok: true })
  })

  it('a chain or an unsupported symbol is still unsupported', async () => {
    const { client } = fakeClient(json('multiply', ['1/2', '1/3', '1/4']))
    expect(await readProblem(client, { text: 'x' })).toMatchObject({ ok: false, reason: 'unsupported' })
  })

  it('works through the route handler, including a friendly 200 for zero divisor', async () => {
    const { client } = fakeClient(json('divide', ['3/5', '0']))
    const res = await handleRead({ text: '3/5 ÷ 0' }, { client, demo: false, limiter: createRateLimiter(), ip: '1.1.1.1' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: false, reason: 'zero_divisor' })
  })
})

describe('hints and the leak guard for multiplication and division', () => {
  it('the hint request accepts the new operations', () => {
    for (const problem of [MUL, DIV]) {
      expect(hintInputSchema.safeParse({ problem, studentAnswer: '8/27', stuck: false, level: 1 }).success).toBe(true)
      expect(explainInputSchema.safeParse({ problem, explanation: 'I flipped it' }).success).toBe(true)
    }
  })

  it('aims at the flip step when she did not flip (2/3 ÷ 4/9 answered 8/27)', () => {
    const ctx = buildHintContext({ problem: DIV, studentAnswer: '8/27', stuck: false, level: 1 })
    expect(ctx.diagnosis?.slip).toBe('forgotReciprocal')
    expect(ctx.steps[ctx.flaggedIndex]!.kind).toBe('flip')
    expect(ctx.correctAnswer).toBe('1 1/2')
  })

  it('sends the new steps, the answer and the diagnosis to the model, with the usual rules', async () => {
    const { client, calls } = fakeClient('What do you do to the second fraction?')
    const result = await generateHint(client, { problem: DIV, studentAnswer: '8/27', stuck: false, level: 2 })
    expect(result).toEqual({ hint: 'What do you do to the second fraction?', source: 'ai' })
    const sent = sentText(calls[0]!)
    expect(sent).toContain('forgotReciprocal')
    expect(sent).toContain('"kind":"flip"')
    expect(sent).toContain('1 1/2')
    expect(String(calls[0]!.system)).toMatch(/multiply and divide/)
  })

  it('catches the answer in every form for a division: "1 1/2", "3/2", and the flagged step result', () => {
    const steps = workedSteps(DIV)
    const flaggedCancel = steps.findIndex((s) => s.kind === 'cancel')
    expect(leaksAnswer('Is the answer 1 1/2?', DIV, steps, 0)).toBe(true)
    expect(leaksAnswer('Is it 3/2?', DIV, steps, 0)).toBe(true)
    // The cancel step "2/3 × 9/4 = 1/1 × 3/2": its new numbers are 1/1 and 3/2.
    expect(leaksAnswer('Does it become 3/2 after cancelling?', DIV, steps, flaggedCancel)).toBe(true)
  })

  it('allows numbers that were already there (the problem and the step before)', () => {
    const steps = workedSteps(DIV)
    const flaggedFlip = steps.findIndex((s) => s.kind === 'flip')
    // The flip step is "2/3 ÷ 4/9 = 2/3 × 9/4": the new number is 9/4. 2/3 and 4/9 are in the problem.
    expect(leaksAnswer('What happens to 4/9 when you divide by it?', DIV, steps, flaggedFlip)).toBe(false)
    expect(leaksAnswer('Is the second fraction now 9/4?', DIV, steps, flaggedFlip)).toBe(true)
  })

  it('treats numbers already on the left of "=" as known, so the convert step does not hide whole numbers from the hint', () => {
    const steps = workedSteps({ op: 'multiply', a: { whole: 0, num: 3, den: 5 }, b: { whole: 10, num: 0, den: 1 } })
    // "3/5 × 10 = 3/5 × 10/1": only 10/1 is new.
    expect(stepResultTokens({ op: 'multiply', a: { whole: 0, num: 3, den: 5 }, b: { whole: 10, num: 0, den: 1 } }, steps, 0)).toEqual(['10/1'])
  })

  it('regenerates when a multiplication hint leaks 8 1/3', async () => {
    const { client, create } = fakeClient('Is the answer 8 1/3?', 'Which numbers can you change into fractions first?')
    const result = await generateHint(client, { problem: MUL, studentAnswer: '6 1/6', stuck: false, level: 1 })
    expect(create).toHaveBeenCalledTimes(2)
    expect(result.hint).toBe('Which numbers can you change into fractions first?')
  })

  it('falls back to a template aimed at the right step when the API fails', async () => {
    const { client } = fakeClient(new Error('down'))
    const mul = await generateHint(client, { problem: MUL, studentAnswer: '6 1/6', stuck: false, level: 2 })
    expect(mul).toEqual({ hint: LEVEL_HINTS.toImproper[1], source: 'template' })
    const div = await generateHint(fakeClient(new Error('down')).client, { problem: DIV, studentAnswer: '8/27', stuck: false, level: 3 })
    expect(div.hint).toBe(LEVEL_HINTS.flip[2])
  })

  it('every template hint for every step of the new operations never leaks', () => {
    for (const problem of [MUL, MUL2, DIV, { op: 'divide', a: { whole: 6, num: 0, den: 1 }, b: { whole: 0, num: 2, den: 3 } } as AnyProblem]) {
      const steps = workedSteps(problem)
      steps.forEach((step, i) => {
        for (const level of [1, 2, 3] as const) {
          const hint = LEVEL_HINTS[step.kind][level - 1]!
          expect(leaksAnswer(hint, problem, steps, i), `${step.kind} L${level}: ${hint}`).toBe(false)
          expect(hint.trim().split(/\s+/).length).toBeLessThanOrEqual(20)
        }
      })
    }
  })

  it('works through the route handler with no key (templates) and the right aim', async () => {
    const res = await handleHint(
      { problem: DIV, studentAnswer: '2/3', stuck: false, level: 1 },
      { client: null, demo: false, limiter: createRateLimiter(), ip: '2.2.2.2' },
    )
    expect(res.body).toMatchObject({ ok: true, source: 'template', hint: 'Which fraction gets flipped when you divide?' })
  })

  it('hints made in the browser use the same targets', () => {
    expect(hintTarget(DIV, '8/27', false).flaggedIndex).toBe(workedSteps(DIV).findIndex((s) => s.kind === 'flip'))
    expect(localHint(MUL, undefined, true, 1)).toBe(LEVEL_HINTS.toImproper[0])
    expect(localHint(MUL2, undefined, true, 1)).toBe(LEVEL_HINTS.cancel[0])
  })
})

describe('explanation feedback for multiplication and division', () => {
  it('the checklist comes from the new steps', () => {
    const div = methodChecklist(DIV).join(' | ')
    expect(div).toMatch(/flipped the second fraction/)
    expect(div).toMatch(/Cancelled common factors/)
    expect(div).toMatch(/Checked the answer/)
    expect(methodChecklist(MUL).join(' | ')).toMatch(/Changed mixed numbers and whole numbers into fractions/)
    expect(methodChecklist({ op: 'multiply', a: { whole: 0, num: 1, den: 2 }, b: { whole: 0, num: 1, den: 3 } }).join(' | ')).not.toMatch(/Cancelled/)
  })

  it('sends the checklist to the model and has a kind template ready', async () => {
    const { client, calls } = fakeClient(JSON.stringify({ verdict: 'clear', praise: 'You flipped the second fraction.' }))
    const result = await evaluateExplanation(client, { problem: DIV, explanation: 'I kept the first, flipped the second and cancelled.' })
    expect(result.verdict).toBe('clear')
    expect(sentText(calls[0]!)).toContain('flipped the second fraction')
    const fallback = await evaluateExplanation(fakeClient(new Error('x')).client, { problem: DIV, explanation: 'I flipped the second one then multiplied.' })
    expect(fallback.source).toBe('template')
    expect(fallback.followUp).toMatch(/\?$/)
  })
})

describe('the Tutor page logic for multiplication and division', () => {
  const api = (problem: AnyProblem): TutorApi => ({
    read: async () => ({ ok: true, problem, operands: ['', ''], problemText: '', confidence: 'high' }),
    understand: async () => ({ ok: true, text: 'Picture it.', source: 'ai' }),
    hint: async ({ level }) => ({ ok: true, hint: `Hint ${level}?`, source: 'ai', level }),
    explain: async () => ({ ok: true, verdict: 'clear', praise: 'Nice.', source: 'ai' }),
  })

  async function atAttempt(problem: AnyProblem) {
    setActivePinia(createPinia())
    const store = useTutorStore()
    store.setApi(api(problem))
    await store.readProblem({ text: 'x' })
    store.confirmProblem()
    store.chooseOperation(store.problem!.op)
    store.continueFromUnderstanding()
    return store
  }

  it('typed problems: dividing by zero is rejected with a kind message, and the other operations are accepted', () => {
    expect(problemError({ op: 'divide', a: DIV.a, b: { whole: 0, num: 0, den: 4 } })).toBe('You can’t divide by zero.')
    expect(problemError({ op: 'divide', a: DIV.a, b: DIV.b })).toBeNull()
    expect(problemError(MUL)).toBeNull()
    expect(problemError({ op: 'multiply', a: DIV.a, b: { whole: 0, num: 0, den: 1 } })).toBeNull()
    expect(problemError({ op: 'subtract', a: DIV.b, b: DIV.a })).toMatch(/bigger number first/)
  })

  it('divide: correct goes to the check, wrong climbs the ladder and records the slip', async () => {
    const store = await atAttempt(DIV)
    expect(await store.submitAnswer('8/27')).toBe('wrong')
    expect(store.state).toBe('hint1')
    expect(store.slip).toBe('forgotReciprocal')
    expect(await store.submitAnswer('1 1/2')).toBe('correct')
    expect(store.state).toBe('check')
  })

  it('divide: add back multiplies, estimate rounds and checks the range', async () => {
    const store = await atAttempt(DIV)
    await store.submitAnswer('1 1/2')
    store.chooseCheck('addBack')
    expect(store.addBackProof?.equation).toBe('1 1/2 × 4/9 = ?')
    expect(store.submitAddBack('2/3')).toBe('correct')
    expect(store.checkDone).toBe(true)

    const other = await atAttempt(MUL)
    await other.submitAnswer('8 1/3')
    other.chooseCheck('estimate')
    expect(other.estimateAvailable).toBe(true)
    expect(other.estimateInfo?.close).toBe(true)
    other.submitRounding('2 1/2', '3 1/2')
    other.answerClose(true)
    expect(other.checkDone).toBe(true)
  })

  it('multiply: add back divides', async () => {
    const store = await atAttempt(MUL)
    await store.submitAnswer('8 1/3')
    store.chooseCheck('addBack')
    expect(store.addBackProof?.equation).toBe('8 1/3 ÷ 3 1/3 = ?')
    expect(store.submitAddBack('2 1/2')).toBe('correct')
  })

  it('a divisor under 1/4 cannot be estimated, so the estimate way is hidden', async () => {
    const tiny: AnyProblem = { op: 'divide', a: { whole: 0, num: 3, den: 4 }, b: { whole: 0, num: 1, den: 8 } } // 6
    const store = await atAttempt(tiny)
    await store.submitAnswer('6')
    expect(store.state).toBe('check')
    expect(store.estimateAvailable).toBe(false)
  })

  it('teach: the Learn steps come from the new engine', async () => {
    const store = await atAttempt(DIV)
    for (let i = 0; i < 4; i++) await store.imStuck()
    expect(store.state).toBe('teach')
    expect(store.hints).toHaveLength(3)
    expect(workedSteps(DIV).map((s) => s.kind)).toEqual(['flip', 'cancel', 'multiplyAcross', 'toMixed', 'answer'])
  })
})

describe('wrong operation hints in the Tutor (templates, so they work with no AI)', () => {
  const times: AnyProblem = { op: 'multiply', a: { whole: 0, num: 2, den: 3 }, b: { whole: 0, num: 3, den: 4 } }
  const over: AnyProblem = { op: 'divide', a: { whole: 6, num: 0, den: 1 }, b: { whole: 0, num: 2, den: 3 } }

  async function ladder(problem: AnyProblem, wrong: string) {
    const hints: string[] = []
    for (const level of [1, 2, 3] as const) {
      const res = await handleHint(
        { problem, studentAnswer: wrong, stuck: false, level },
        { client: null, demo: false, limiter: createRateLimiter(), ip: `9.9.9.${level}` },
      )
      hints.push((res.body as { hint: string }).hint)
    }
    return hints
  }

  it('multiplying answered by adding: repeated addition, then repeat-or-part, then repeated again', async () => {
    expect(await ladder(times, '1 5/12')).toEqual([
      'Multiplying is repeated adding. How many times should you add it?',
      'Does the problem repeat an amount, or find a part of an amount?',
      'If an amount is repeated again and again, which operation fits?',
    ])
  })

  it('dividing answered by adding: part or split, then share-or-count, then how many fit', async () => {
    expect(await ladder(over, '6 2/3')).toEqual([
      'Are we taking a part of it, or splitting it up?',
      'Does the problem share something equally, or count how many parts fit?',
      'If you want to know how many parts fit, which operation helps?',
    ])
  })

  it('adding and subtracting keep their own hints', async () => {
    const sub: AnyProblem = { op: 'subtract', a: { whole: 8, num: 1, den: 5 }, b: { whole: 4, num: 3, den: 4 } }
    expect((await ladder(sub, '12 19/20'))[0]).toBe('Are we putting together or taking away?')
    expect((await ladder(sub, '12 19/20'))[1]).toBe('Does the problem put amounts together, or take some away?')
  })

  it('hints made in the browser match', () => {
    expect(localHint(times, '1 5/12', false, 1)).toBe('Multiplying is repeated adding. How many times should you add it?')
    expect(localHint(over, '6 2/3', false, 2)).toBe('Does the problem share something equally, or count how many parts fit?')
  })

  it('every one is one short question with no numbers', () => {
    for (const hint of [
      'Does the problem repeat an amount, or find a part of an amount?',
      'If an amount is repeated again and again, which operation fits?',
      'Does the problem share something equally, or count how many parts fit?',
      'If you want to know how many parts fit, which operation helps?',
    ]) {
      expect((hint.match(/\?/g) ?? []).length).toBe(1)
      expect(hint.split(' ').length).toBeLessThanOrEqual(20)
      expect(hint).not.toMatch(/\d/)
    }
  })

  it('the AI is told the same idea, and the guard still blocks any answer', async () => {
    const { client, calls } = fakeClient('Multiplying is repeated adding. How many times should you add it?')
    const result = await generateHint(client, { problem: times, studentAnswer: '1 5/12', stuck: false, level: 1 })
    expect(result.source).toBe('ai')
    expect(String(calls[0]!.system)).toMatch(/repeated adding/)
    expect(String(calls[0]!.system)).toMatch(/taking a part of it or splitting it up/)
    expect(sentText(calls[0]!)).toContain('wrongOperation')
    const leaky = fakeClient('Is the answer 1/2?', 'How many times should you add it?')
    expect((await generateHint(leaky.client, { problem: times, studentAnswer: '1 5/12', stuck: false, level: 1 })).hint).toBe('How many times should you add it?')
  })
})

describe('add and subtract answered with a multiplication or division result (Tutor)', () => {
  const sum: AnyProblem = { op: 'add', a: { whole: 0, num: 1, den: 5 }, b: { whole: 0, num: 3, den: 4 } }
  const NOT_REPEAT = 'We aren’t repeating or splitting. Are we putting together or taking away?'

  it('the hint ladder works without the AI: the new hint first, then the usual put-together-or-take-away questions', async () => {
    const hints: string[] = []
    for (const level of [1, 2, 3] as const) {
      const res = await handleHint(
        { problem: sum, studentAnswer: '3/20', stuck: false, level },
        { client: null, demo: false, limiter: createRateLimiter(), ip: `4.4.4.${level}` },
      )
      hints.push((res.body as { hint: string }).hint)
    }
    expect(hints).toEqual([
      NOT_REPEAT,
      'Does the problem put amounts together, or take some away?',
      'If the problem asks how much is left, which operation fits?',
    ])
  })

  it('hints made in the browser match', () => {
    expect(localHint(sum, '3/20', false, 1)).toBe(NOT_REPEAT)
  })

  it('the AI is told the same idea, and the guard still blocks the answer', async () => {
    const { client, calls } = fakeClient('Is the answer 19/20?', 'Are we joining the amounts, or taking some away?')
    const result = await generateHint(client, { problem: sum, studentAnswer: '3/20', stuck: false, level: 1 })
    expect(result.hint).toBe('Are we joining the amounts, or taking some away?')
    expect(String(calls[0]!.system)).toMatch(/not repeating or splitting/)
  })
})
