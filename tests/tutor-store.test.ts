import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTutorStore } from '../app/stores/tutor'
import type { Problem } from '../app/utils/fraction'
import type { ExplainReply, HintReply, ReadReply, TutorApi } from '../app/utils/tutorApi'

const SUB: Problem = { op: 'subtract', a: { whole: 8, num: 1, den: 5 }, b: { whole: 4, num: 3, den: 4 } } // 3 9/20
const ADD: Problem = { op: 'add', a: { whole: 4, num: 1, den: 3 }, b: { whole: 2, num: 5, den: 12 } } // 6 3/4
const PHOTO = { imageBase64: 'AAAA', mediaType: 'image/jpeg' as const }

interface FakeOptions {
  read?: ReadReply
  hint?: (level: number) => HintReply
  explain?: ExplainReply[]
}

function fakeApi(options: FakeOptions = {}) {
  const explainReplies = [...(options.explain ?? [])]
  const api: TutorApi & { read: ReturnType<typeof vi.fn>; hint: ReturnType<typeof vi.fn>; explain: ReturnType<typeof vi.fn> } = {
    read: vi.fn(async () => options.read ?? { ok: true, problem: SUB, operands: ['8 1/5', '4 3/4'], problemText: 'An elephant has 8 1/5 buckets.', confidence: 'high' }),
    hint: vi.fn(async ({ level }: { level: 1 | 2 | 3 }) => options.hint?.(level) ?? { ok: true, hint: `Hint ${level}, what do you notice?`, source: 'ai', level }),
    explain: vi.fn(async () => explainReplies.shift() ?? { ok: true, verdict: 'clear', praise: 'You checked your work.', source: 'ai' }),
  }
  return api
}

/** Photo -> confirm -> attempt, ready to answer. */
async function atAttempt(api = fakeApi()) {
  const store = useTutorStore()
  store.setApi(api)
  await store.readProblem(PHOTO)
  store.confirmProblem()
  return { store, api }
}

/** Gets to the check step with a correct answer. */
async function atCheck(problem: Problem = SUB, answer = '3 9/20') {
  const api = fakeApi({ read: { ok: true, problem, operands: ['', ''], problemText: '', confidence: 'high' } })
  const { store } = await atAttempt(api)
  await store.submitAnswer(answer)
  return { store, api }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('capture and confirm', () => {
  it('starts at capture', () => {
    const store = useTutorStore()
    expect(store.state).toBe('capture')
    expect(store.problem).toBeNull()
  })

  it('a photo always goes to confirm, never straight to the attempt', async () => {
    const store = useTutorStore()
    const api = fakeApi()
    store.setApi(api)
    expect(await store.readProblem(PHOTO)).toBe(true)
    expect(store.state).toBe('confirm')
    expect(store.source).toBe('photo')
    expect(store.problem).toEqual(SUB)
    expect(api.read).toHaveBeenCalledWith(PHOTO)
  })

  it('a typed word problem goes to confirm too, even when the AI is sure', async () => {
    const store = useTutorStore()
    store.setApi(fakeApi())
    await store.readProblem({ text: 'An elephant has 8 1/5 buckets and drinks 4 3/4.' })
    expect(store.state).toBe('confirm')
    expect(store.source).toBe('text')
    expect(store.confidence).toBe('high')
  })

  it('typed numbers go to confirm too', () => {
    const store = useTutorStore()
    expect(store.enterTyped(SUB)).toBeNull()
    expect(store.state).toBe('confirm')
    expect(store.source).toBe('typed')
  })

  it('a low-confidence read still goes to confirm and says so', async () => {
    const store = useTutorStore()
    store.setApi(fakeApi({ read: { ok: true, problem: SUB, operands: ['', ''], problemText: 'x', confidence: 'low' } }))
    await store.readProblem(PHOTO)
    expect(store.state).toBe('confirm')
    expect(store.confidence).toBe('low')
  })

  it('she cannot answer until she says "Yes" on the confirm step', async () => {
    const store = useTutorStore()
    store.setApi(fakeApi())
    await store.readProblem(PHOTO)
    expect(await store.submitAnswer('3 9/20')).toBeNull()
    expect(await store.imStuck()).toBe(false)
    expect(store.state).toBe('confirm')
    expect(store.confirmProblem()).toBe(true)
    expect(store.state).toBe('attempt')
  })

  it('"Fix it" changes the problem and she has to confirm again', async () => {
    const store = useTutorStore()
    store.setApi(fakeApi())
    await store.readProblem(PHOTO)
    expect(store.editProblem(ADD)).toBeNull()
    expect(store.state).toBe('confirm')
    expect(store.problem).toEqual(ADD)
    expect(store.confirmProblem()).toBe(true)
    expect(store.state).toBe('attempt')
  })

  it('"Fix it" rejects numbers that make no sense, with a kind message, and stays on confirm', async () => {
    const store = useTutorStore()
    store.setApi(fakeApi())
    await store.readProblem(PHOTO)
    const smallFirst: Problem = { op: 'subtract', a: { whole: 1, num: 1, den: 4 }, b: { whole: 3, num: 0, den: 1 } }
    expect(store.editProblem(smallFirst)).toMatch(/bigger number first/)
    expect(store.problem).toEqual(SUB)
    expect(store.editProblem({ op: 'add', a: { whole: 1, num: 1, den: 0 }, b: SUB.b })).toMatch(/zero/)
    expect(store.state).toBe('confirm')
  })

  it('typed numbers are checked before confirm', () => {
    const store = useTutorStore()
    expect(store.enterTyped({ op: 'subtract', a: { whole: 1, num: 0, den: 1 }, b: { whole: 2, num: 0, den: 1 } })).toMatch(/bigger/)
    expect(store.state).toBe('capture')
    expect(store.error).toMatch(/bigger/)
  })

  it('a failed read stays on capture with the tutor message', async () => {
    const store = useTutorStore()
    store.setApi(fakeApi({ read: { ok: false, reason: 'unsupported', message: 'I can only help with adding and subtracting fractions right now.' } }))
    expect(await store.readProblem(PHOTO)).toBe(false)
    expect(store.state).toBe('capture')
    expect(store.error).toMatch(/adding and subtracting/)
    expect(store.busy).toBeNull()
  })

  it('shows "reading" while the tutor works', async () => {
    const store = useTutorStore()
    let release: (r: ReadReply) => void = () => {}
    const api = fakeApi()
    api.read.mockImplementation(() => new Promise<ReadReply>((resolve) => (release = resolve)))
    store.setApi(api)
    const pending = store.readProblem(PHOTO)
    expect(store.busy).toBe('reading')
    release({ ok: true, problem: SUB, operands: ['', ''], problemText: '', confidence: 'high' })
    await pending
    expect(store.busy).toBeNull()
  })
})

describe('attempt: correct on the first try', () => {
  it('goes straight to the check, with no hints', async () => {
    const { store, api } = await atAttempt()
    expect(await store.submitAnswer('3 9/20')).toBe('correct')
    expect(store.state).toBe('check')
    expect(store.attempts).toBe(1)
    expect(store.hintsUsed).toBe(0)
    expect(store.slip).toBeNull()
    expect(store.acceptedAnswer).toBe('3 9/20')
    expect(api.hint).not.toHaveBeenCalled()
  })

  it('ignores a blank answer', async () => {
    const { store } = await atAttempt()
    expect(await store.submitAnswer('   ')).toBeNull()
    expect(store.attempts).toBe(0)
  })
})

describe('attempt: equal but not simplest', () => {
  it('stays in attempt and asks her to simplify (no hint, not counted as wrong)', async () => {
    const { store, api } = await atAttempt()
    expect(await store.submitAnswer('69/20')).toBe('correctNotSimplest')
    expect(store.state).toBe('attempt')
    expect(store.notSimplest).toBe(true)
    expect(store.hintsUsed).toBe(0)
    expect(store.wrongMessage).toBe('')
    expect(api.hint).not.toHaveBeenCalled()
    expect(await store.submitAnswer('3 9/20')).toBe('correct')
    expect(store.state).toBe('check')
    expect(store.notSimplest).toBe(false)
    expect(store.attempts).toBe(2)
  })

  it('also stays put when it happens during a hint', async () => {
    const { store } = await atAttempt()
    await store.submitAnswer('3 11/20')
    expect(store.state).toBe('hint1')
    await store.submitAnswer('69/20')
    expect(store.state).toBe('hint1')
    expect(store.notSimplest).toBe(true)
  })
})

describe('hints: wrong answers climb the ladder', () => {
  it('wrong -> hint1 -> hint2 -> hint3 -> teach, one hint at a time from the tutor', async () => {
    const { store, api } = await atAttempt()
    expect(await store.submitAnswer('3 11/20')).toBe('wrong')
    expect(store.state).toBe('hint1')
    expect(store.hints).toEqual(['Hint 1, what do you notice?'])
    expect(api.hint).toHaveBeenLastCalledWith({ problem: SUB, studentAnswer: '3 11/20', stuck: false, level: 1 })
    expect(store.wrongMessage).toBeTruthy()

    await store.submitAnswer('3 10/20')
    expect(store.state).toBe('hint2')
    expect(api.hint).toHaveBeenLastCalledWith({ problem: SUB, studentAnswer: '3 10/20', stuck: false, level: 2 })

    await store.submitAnswer('3 12/20')
    expect(store.state).toBe('hint3')
    expect(store.hintsUsed).toBe(3)

    await store.submitAnswer('3 13/20')
    expect(store.state).toBe('teach')
    expect(store.reachedTeach).toBe(true)
    expect(store.hintsUsed).toBe(3) // no fourth hint
    expect(api.hint).toHaveBeenCalledTimes(3)
    expect(store.attempts).toBe(4)
  })

  it('records the slip type the engine diagnosed', async () => {
    const { store } = await atAttempt()
    await store.submitAnswer('3 11/20')
    expect(store.slip).toBe('numeratorArithmetic')
    expect(store.lastWrongAnswer).toBe('3 11/20')
  })

  it('a correct answer at any hint goes to the check', async () => {
    for (const wrongs of [1, 2, 3]) {
      setActivePinia(createPinia())
      const { store } = await atAttempt()
      for (let i = 0; i < wrongs; i++) await store.submitAnswer(`3 ${10 + i}/20`)
      expect(store.state).toBe(`hint${wrongs}`)
      expect(await store.submitAnswer('3 9/20')).toBe('correct')
      expect(store.state).toBe('check')
      expect(store.hintsUsed).toBe(wrongs)
    }
  })
})

describe('stuck', () => {
  it('"I\'m stuck" with no answer: attempt -> hint1 -> hint2 -> hint3 -> teach', async () => {
    const { store, api } = await atAttempt()
    await store.imStuck()
    expect(store.state).toBe('hint1')
    expect(api.hint).toHaveBeenLastCalledWith({ problem: SUB, studentAnswer: undefined, stuck: true, level: 1 })
    await store.imStuck()
    expect(store.state).toBe('hint2')
    await store.imStuck()
    expect(store.state).toBe('hint3')
    await store.imStuck()
    expect(store.state).toBe('teach')
    expect(store.hintsUsed).toBe(3)
    expect(store.attempts).toBe(0)
    expect(store.slip).toBeNull()
  })

  it('is not available in teach (the steps are in front of her)', async () => {
    const { store } = await atAttempt()
    for (let i = 0; i < 4; i++) await store.imStuck()
    expect(store.state).toBe('teach')
    expect(store.canBeStuck).toBe(false)
    expect(await store.imStuck()).toBe(false)
  })

  it('still passes along her last wrong answer so the hint can aim at the slip', async () => {
    const { store, api } = await atAttempt()
    await store.submitAnswer('3 11/20')
    await store.imStuck()
    expect(api.hint).toHaveBeenLastCalledWith({ problem: SUB, studentAnswer: '3 11/20', stuck: true, level: 2 })
  })
})

describe('teach', () => {
  async function atTeach() {
    const { store, api } = await atAttempt()
    for (let i = 0; i < 4; i++) await store.imStuck()
    return { store, api }
  }

  it('after hint 3 the Learn panel is shown, and she answers the same problem again', async () => {
    const { store } = await atTeach()
    expect(store.state).toBe('teach')
    expect(store.problem).toEqual(SUB)
    expect(store.canAnswer).toBe(true)
  })

  it('a wrong answer in teach stays in teach, with no more hints', async () => {
    const { store, api } = await atTeach()
    const calls = api.hint.mock.calls.length
    expect(await store.submitAnswer('3 11/20')).toBe('wrong')
    expect(store.state).toBe('teach')
    expect(api.hint.mock.calls.length).toBe(calls)
    expect(store.lastWrongAnswer).toBe('3 11/20') // the Learn panel highlights from this
  })

  it('a correct answer after teaching goes to the check', async () => {
    const { store } = await atTeach()
    expect(await store.submitAnswer('3 9/20')).toBe('correct')
    expect(store.state).toBe('check')
  })
})

describe('hints when the tutor cannot be reached', () => {
  it('uses a hint made in the browser and says so', async () => {
    const api = fakeApi({ hint: () => ({ ok: false, reason: 'offline', message: 'No internet right now.' }) })
    const { store } = await atAttempt(api)
    await store.submitAnswer('3 11/20')
    expect(store.state).toBe('hint1')
    expect(store.hints).toHaveLength(1)
    expect(store.hints[0]).toMatch(/\?$/)
    expect(store.hintsOffline).toBe(true)
    expect(store.busy).toBeNull()
  })

  it('the offline hints never contain the answer', async () => {
    const api = fakeApi({ hint: () => ({ ok: false, reason: 'unavailable', message: 'x' }) })
    const { store } = await atAttempt(api)
    for (let i = 0; i < 4; i++) await store.imStuck()
    for (const hint of store.hints) expect(hint).not.toMatch(/3 9\/20|69\/20/)
  })
})

describe('check is required before explain', () => {
  it('cannot go to explain, or explain, until the check is done', async () => {
    const { store, api } = await atCheck()
    expect(store.state).toBe('check')
    expect(store.continueFromCheck()).toBe(false)
    expect(await store.submitExplanation('I matched the bottoms')).toBe(false)
    expect(api.explain).not.toHaveBeenCalled()
    expect(store.state).toBe('check')
  })

  it('choosing a check is not completing it', async () => {
    const { store } = await atCheck()
    expect(store.chooseCheck('addBack')).toBe(true)
    expect(store.checkDone).toBe(false)
    expect(store.continueFromCheck()).toBe(false)
  })

  it('add back: the proof component gets the equation, and a correct add-back finishes the check', async () => {
    const { store } = await atCheck()
    store.chooseCheck('addBack')
    expect(store.addBackProof?.equation).toBe('3 9/20 + 4 3/4 = ?')
    expect(store.submitAddBack('8 1/5')).toBe('correct')
    expect(store.checkDone).toBe(true)
    expect(store.checkMethod).toBe('addBack')
    expect(store.continueFromCheck()).toBe(true)
    expect(store.state).toBe('explain')
  })

  it('add back for addition uses subtraction', async () => {
    const { store } = await atCheck(ADD, '6 3/4')
    store.chooseCheck('addBack')
    expect(store.addBackProof?.equation).toBe('6 3/4 − 2 5/12 = ?')
    expect(store.submitAddBack('4 1/3')).toBe('correct')
  })

  it('add back: one wrong try gets encouragement and a hint; two show the worked steps and finish', async () => {
    const { store } = await atCheck()
    store.chooseCheck('addBack')
    expect(store.submitAddBack('9')).toBe('wrong')
    expect(store.addBackProof?.encouragement).toBeTruthy()
    expect(store.addBackProof?.hint).toMatch(/undo subtracting/)
    expect(store.checkDone).toBe(false)
    expect(store.submitAddBack('8')).toBe('wrong')
    expect(store.addBackProof?.steps.length).toBeGreaterThan(0)
    expect(store.checkDone).toBe(true)
    expect(store.checkMethod).toBe('addBack')
  })

  it('add back: an equal but not simplest answer is only a nudge', async () => {
    const { store } = await atCheck()
    store.chooseCheck('addBack')
    expect(store.submitAddBack('41/5')).toBe('correctNotSimplest')
    expect(store.checkDone).toBe(false)
  })

  it('estimate: round each number, then say the answer is close', async () => {
    const { store } = await atCheck()
    store.chooseCheck('estimate')
    expect(store.estimateInfo?.close).toBe(true)
    expect(store.submitRounding('8', '5')).toEqual({ a: true, b: true })
    expect(store.estimate.stage).toBe('compare')
    expect(store.checkDone).toBe(false)
    expect(store.answerClose(true)).toBe(true)
    expect(store.checkDone).toBe(true)
    expect(store.checkMethod).toBe('estimate')
    expect(store.continueFromCheck()).toBe(true)
  })

  it('estimate: tells her which number to look at again, and shows the rounding after two tries', async () => {
    const { store } = await atCheck()
    store.chooseCheck('estimate')
    expect(store.submitRounding('8', '4')).toEqual({ a: true, b: false })
    expect(store.estimate.stage).toBe('round')
    expect(store.submitRounding('9', '4')).toEqual({ a: false, b: false })
    expect(store.estimate.revealed).toBe(true)
    expect(store.estimate.stage).toBe('compare')
  })

  it('estimate: saying "not close" is gently corrected; a second miss still lets her move on', async () => {
    const { store } = await atCheck()
    store.chooseCheck('estimate')
    store.submitRounding('8', '5')
    expect(store.answerClose(false)).toBe(false)
    expect(store.estimate.closeMessage).toMatch(/half a whole/)
    expect(store.checkDone).toBe(false)
    store.answerClose(false)
    expect(store.checkDone).toBe(true)
  })

  it('she can switch between the two ways before finishing', async () => {
    const { store } = await atCheck()
    store.chooseCheck('addBack')
    store.chooseCheck('estimate')
    expect(store.chosenCheck).toBe('estimate')
    store.submitRounding('8', '5')
    store.answerClose(true)
    expect(store.chooseCheck('addBack')).toBe(false) // done: no switching
  })

  it('check actions do nothing outside the check step', async () => {
    const { store } = await atAttempt()
    expect(store.chooseCheck('addBack')).toBe(false)
    expect(store.submitAddBack('8 1/5')).toBeNull()
    expect(store.submitRounding('8', '5')).toBeNull()
    expect(store.answerClose(true)).toBeNull()
  })
})

describe('explain', () => {
  async function atExplain(api = fakeApi()) {
    const { store } = await atAttempt(api)
    await store.submitAnswer('3 9/20')
    store.chooseCheck('addBack')
    store.submitAddBack('8 1/5')
    store.continueFromCheck()
    return { store, api }
  }

  it('a clear explanation goes to done with the praise and verdict', async () => {
    const { store, api } = await atExplain()
    expect(await store.submitExplanation('I matched the bottoms, borrowed, and added back.')).toBe(true)
    expect(api.explain).toHaveBeenCalledWith({ problem: SUB, explanation: 'I matched the bottoms, borrowed, and added back.' })
    expect(store.state).toBe('done')
    expect(store.explanation.verdict).toBe('clear')
    expect(store.explanation.praise).toBe('You checked your work.')
  })

  it('a follow-up question gets one extra try, then she moves on', async () => {
    const api = fakeApi({
      explain: [
        { ok: true, verdict: 'partly', praise: 'Nice start on the bottoms.', followUp: 'What did you do when the top was too small?', source: 'ai' },
        { ok: true, verdict: 'partly', praise: 'Good thinking.', followUp: 'Anything else?', source: 'ai' },
      ],
    })
    const { store } = await atExplain(api)
    await store.submitExplanation('I made the bottoms match')
    expect(store.state).toBe('explain')
    expect(store.explanation.followUp).toBe('What did you do when the top was too small?')
    await store.submitExplanation('I borrowed one whole')
    expect(store.state).toBe('done')
    expect(store.explanation.verdict).toBe('partly')
    expect(api.explain).toHaveBeenCalledTimes(2)
  })

  it('she can skip after a follow-up question', async () => {
    const api = fakeApi({
      explain: [{ ok: true, verdict: 'partly', praise: 'Nice.', followUp: 'Why?', source: 'ai' }],
    })
    const { store } = await atExplain(api)
    expect(store.canSkipExplanation).toBe(false)
    await store.submitExplanation('I made the bottoms match')
    expect(store.canSkipExplanation).toBe(true)
    expect(store.skipExplanation()).toBe(true)
    expect(store.state).toBe('done')
  })

  it('when the tutor can not be reached she sees a friendly message and can skip', async () => {
    const api = fakeApi()
    api.explain.mockResolvedValue({ ok: false, reason: 'offline', message: 'No internet right now. Check your connection and try again.' })
    const { store } = await atExplain(api)
    expect(await store.submitExplanation('I matched the bottoms')).toBe(false)
    expect(store.state).toBe('explain')
    expect(store.error).toMatch(/No internet/)
    expect(store.canSkipExplanation).toBe(true)
    store.skipExplanation()
    expect(store.state).toBe('done')
    expect(store.explanation.verdict).toBeNull()
  })

  it('sends at most 500 characters', async () => {
    const { store, api } = await atExplain()
    await store.submitExplanation('x'.repeat(800))
    expect(api.explain.mock.calls[0]![0].explanation).toHaveLength(500)
  })

  it('does nothing in other steps', async () => {
    const { store, api } = await atAttempt()
    expect(await store.submitExplanation('anything at all')).toBe(false)
    expect(api.explain).not.toHaveBeenCalled()
  })
})

describe('the whole journey and starting over', () => {
  it('stuck -> 3 hints -> teach -> answer -> check -> explain -> done, then "Solve another"', async () => {
    const { store } = await atAttempt()
    for (let i = 0; i < 4; i++) await store.imStuck()
    expect(store.state).toBe('teach')
    await store.submitAnswer('3 9/20')
    store.chooseCheck('estimate')
    store.submitRounding('8', '5')
    store.answerClose(true)
    store.continueFromCheck()
    await store.submitExplanation('I rounded to see if it made sense.')
    expect(store.state).toBe('done')
    expect({ hints: store.hintsUsed, method: store.checkMethod, verdict: store.explanation.verdict }).toEqual({
      hints: 3,
      method: 'estimate',
      verdict: 'clear',
    })

    store.reset()
    expect(store.state).toBe('capture')
    expect(store.problem).toBeNull()
    expect(store.hintsUsed).toBe(0)
    expect(store.attempts).toBe(0)
    expect(store.checkMethod).toBeNull()
    expect(store.explanation.verdict).toBeNull()
  })

  it('actions in the wrong state do nothing', async () => {
    const store = useTutorStore()
    store.setApi(fakeApi())
    expect(store.confirmProblem()).toBe(false)
    expect(await store.submitAnswer('3 9/20')).toBeNull()
    expect(await store.imStuck()).toBe(false)
    expect(store.continueFromCheck()).toBe(false)
    expect(store.skipExplanation()).toBe(false)
    await store.readProblem(PHOTO)
    expect(await store.readProblem(PHOTO)).toBe(false) // already past capture
  })
})
