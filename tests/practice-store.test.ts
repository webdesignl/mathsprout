import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { formatMixed, problemAnswer, subtract, type AnyProblem, type MixedNumber, type MulProblem, type Problem } from '../app/utils/fraction'
import { SET_SIZE, usePracticeStore } from '../app/stores/practice'
import { withStory } from '../app/utils/stories'
import { PROOF_SLIP_MESSAGES } from '../app/utils/messages'

const sub: Problem = { op: 'subtract', a: { whole: 8, num: 1, den: 5 }, b: { whole: 4, num: 3, den: 4 } } // 3 9/20
const SUB_PROBLEM: Problem = sub
const add: Problem = { op: 'add', a: { whole: 4, num: 1, den: 3 }, b: { whole: 2, num: 5, den: 12 } } // 6 3/4

/** After the last problem she sees the real-world screen; skip through it to reach the summary. */
function leaveUnlock(store: ReturnType<typeof usePracticeStore>) {
  store.skipExamples()
  store.continueToSummary()
}

function setup(list: AnyProblem[] = [sub, add]) {
  const store = usePracticeStore()
  store.startWith(list, { op: 'mixed', needsRegroup: false })
  return store
}

/** The correct proof for each fixture: sub gives back 8 1/5, add gives back 4 1/3. */
const PROOF: Record<string, string> = { subtract: '8 1/5', add: '4 1/3' }
function solveAndProve(store: ReturnType<typeof usePracticeStore>, answer: string) {
  store.submit(answer)
  store.submitProof(PROOF[store.current!.op]!)
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('practice store', () => {
  it('start() builds a set of 10 problems with matching bookkeeping', () => {
    const store = usePracticeStore()
    store.start({ op: 'mixed', needsRegroup: true }, () => 0.37)
    expect(store.total).toBe(SET_SIZE)
    expect(store.attempts).toHaveLength(SET_SIZE)
    expect(store.status.every((s) => s === 'unanswered')).toBe(true)
    expect(store.index).toBe(0)
    expect(store.score).toBe(0)
    expect(store.finished).toBe(false)
  })

  it('correct flow: scores, offers the add-back check, then moves on', () => {
    const store = setup()
    expect(store.submit('3 9/20')).toBe('correct')
    // On the first problems of a type she is not told yet: she proves it first.
    expect(store.proofPending).toBe(true)
    expect(store.isSolved).toBe(false)
    expect(store.feedback).toBeNull()
    expect(store.score).toBe(0)
    expect(store.status[0]).toBe('unanswered')
    expect(store.proof?.equation).toBe('3 9/20 + 4 3/4 = ?')
    expect(store.next()).toBe(false)
    expect(store.submitProof('8 1/5')).toBe('correct')
    // Now the result is revealed.
    expect(store.proofPending).toBe(false)
    expect(store.isSolved).toBe(true)
    expect(store.feedback?.kind).toBe('correct')
    expect(store.score).toBe(1)
    expect(store.status[0]).toBe('correct')
    expect(store.attempts[0]).toBe(1)
    expect(store.hintsShown[0]).toBe(0)
    expect(store.firstTryCorrect[0]).toBe(true)
    expect(store.next()).toBe(true)
    expect(store.index).toBe(1)
    expect(store.feedback).toBeNull()
  })

  it('correctNotSimplest does not score or count as wrong, and can be retried', () => {
    const store = setup()
    expect(store.submit('69/20')).toBe('correctNotSimplest')
    expect(store.score).toBe(0)
    expect(store.wrongAttempts[0]).toBe(0)
    expect(store.attempts[0]).toBe(1)
    expect(store.feedback?.kind).toBe('notSimplest')
    expect(store.next()).toBe(false)
    expect(store.submit('3 9/20')).toBe('correct')
    store.submitProof('8 1/5')
    expect(store.score).toBe(1)
  })

  it('wrong then hint: shows the diagnose hint, never the answer', () => {
    const store = setup()
    expect(store.submit('3 11/20')).toBe('wrong')
    expect(store.wrongAttempts[0]).toBe(1)
    expect(store.hintsShown[0]).toBe(1)
    const fb = store.feedback
    expect(fb?.kind).toBe('wrong')
    if (fb?.kind !== 'wrong') return
    expect(fb.hints).toHaveLength(1)
    expect(fb.hints[0]).toMatch(/\?$/)
    expect(fb.canShowSteps).toBe(false)
    expect(fb.moreHints).toBe(true)

    store.nextHint()
    expect(store.hintsShown[0]).toBe(2)
    const after = store.feedback
    if (after?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(after.hints).toHaveLength(2)
    expect(after.moreHints).toBe(false)
    for (const hint of after.hints) expect(hint).not.toContain('3 9/20')

    // Steps are locked until the second wrong answer.
    store.showSteps()
    expect(store.stepsShown[0]).toBe(0)
  })

  it('wrong twice then steps: reveals one step at a time and never the answer step', () => {
    const store = setup()
    store.submit('3 11/20')
    store.submit('3 10/20')
    expect(store.wrongAttempts[0]).toBe(2)
    const fb = store.feedback
    if (fb?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(fb.canShowSteps).toBe(true)
    expect(fb.steps).toHaveLength(0)

    store.showSteps()
    expect(store.stepsShown[0]).toBe(1)
    store.showSteps()
    expect(store.stepsShown[0]).toBe(2)

    for (let i = 0; i < 10; i++) store.showSteps()
    const all = store.feedback
    if (all?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(all.moreSteps).toBe(false)
    expect(all.steps.map((s) => s.kind)).toEqual(['rename', 'regroup', 'subtractWholes', 'subtractNumerators'])
    expect(all.steps.some((s) => s.kind === 'answer')).toBe(false)
  })

  it('score counts solved problems and records which needed help', () => {
    const store = setup()
    store.submit('3 11/20') // wrong, hint shown
    expect(store.submit('3 9/20')).toBe('correct')
    store.submitProof('8 1/5')
    expect(store.status[0]).toBe('correctWithHelp')
    store.next()
    expect(store.submit('6 3/4')).toBe('correct')
    store.submitProof('4 1/3')
    expect(store.status[1]).toBe('correct')
    expect(store.score).toBe(2)
    expect(store.needsHelp.map((p) => p.number)).toEqual([1])
    expect(store.next()).toBe(true)
    expect(store.finished).toBe(true)
  })

  it('ignores blank answers and answers after the problem is solved', () => {
    const store = setup()
    expect(store.submit('   ')).toBeNull()
    expect(store.attempts[0]).toBe(0)
    store.submit('3 9/20')
    expect(store.submit('3 9/20')).toBeNull() // waiting for her proof
    store.submitProof('8 1/5')
    expect(store.submit('3 9/20')).toBeNull()
    expect(store.score).toBe(1)
  })

  it('invalid input counts as wrong without throwing', () => {
    const store = setup()
    expect(store.submit('1/0')).toBe('wrong')
    expect(store.submit('banana')).toBe('wrong')
    expect(store.wrongAttempts[0]).toBe(2)
  })

  it('reset() clears the set', () => {
    const store = setup()
    store.submit('3 9/20')
    store.reset()
    expect(store.total).toBe(0)
    expect(store.score).toBe(0)
  })
})

describe('proof step', () => {
  it('subtraction: she fills in result + b, and the engine checks it', () => {
    const store = setup()
    store.submit('3 9/20')
    expect(store.proof?.equation).toBe('3 9/20 + 4 3/4 = ?')
    expect(store.submitProof('8 1/5')).toBe('correct')
    expect(store.proof?.done).toBe(true)
    expect(store.canAdvance).toBe(true)
  })

  it('addition: she fills in result - b', () => {
    const store = setup([add])
    store.submit('6 3/4')
    expect(store.proof?.equation).toBe('6 3/4 − 2 5/12 = ?')
    expect(store.submitProof('4 1/3')).toBe('correct')
    expect(store.canAdvance).toBe(true)
  })

  it('is not available before the problem is solved', () => {
    const store = setup()
    expect(store.proof).toBeNull()
    expect(store.submitProof('8 1/5')).toBeNull()
    store.submit('3 11/20')
    expect(store.proof).toBeNull()
  })

  it('accepts an equal but not simplest proof only as a nudge', () => {
    const store = setup()
    store.submit('3 9/20')
    expect(store.submitProof('41/5')).toBe('correctNotSimplest')
    expect(store.proof?.done).toBe(false)
    expect(store.proof?.helped).toBe(false)
  })

  it('wrong once gives a hint question; wrong twice shows the worked add-back', () => {
    const store = setup()
    store.submit('3 9/20')
    expect(store.submitProof('8 2/5')).toBe('wrong')
    expect(store.proof?.done).toBe(false)
    expect(store.proof?.hint).toMatch(/\?$/)
    expect(store.proof?.hint).not.toContain('8 1/5')
    expect(store.canAdvance).toBe(false)

    expect(store.submitProof('8 3/5')).toBe('wrong')
    expect(store.proof?.done).toBe(true)
    expect(store.proof?.steps.length).toBeGreaterThan(0)
    expect(store.proof?.steps.map((s) => s.kind)).toContain('rename')
    expect(store.canAdvance).toBe(true)
  })

  it('invalid proof input is wrong and never throws', () => {
    const store = setup()
    store.submit('3 9/20')
    expect(() => store.submitProof('1/0')).not.toThrow()
    expect(store.proof?.helped).toBe(true)
  })
})

describe('retry missed problems', () => {
  /** Finishes a two-problem set: problem 1 missed first, problem 2 right first try. */
  function finishSet() {
    const store = setup()
    store.submit('3 11/20') // wrong
    solveAndProve(store, '3 9/20')
    store.next()
    solveAndProve(store, '6 3/4')
    store.next()
    leaveUnlock(store)
    return store
  }

  it('records first try and retry separately', () => {
    const store = finishSet()
    expect(store.view).toBe('summary')
    expect(store.firstTryCorrect).toEqual([false, true])
    expect(store.retryCorrect).toEqual([false, false])
    expect(store.summary.firstTryCount).toBe(1)
    expect(store.summary.afterRetryCount).toBe(1)
    expect(store.summary.missed).toEqual([0])
  })

  it('a retry updates retryCorrect but not firstTryCorrect', () => {
    const store = finishSet()
    store.retryProblem(0)
    expect(store.view).toBe('playing')
    expect(store.isRetry).toBe(true)
    store.submit('3 9/20')
    expect(store.retryCorrect).toEqual([false, false]) // proof first, then the result
    store.submitProof('8 1/5')
    expect(store.retryCorrect).toEqual([true, false])
    expect(store.firstTryCorrect).toEqual([false, true])
    expect(store.next()).toBe(true)
    expect(store.view).toBe('summary')
    expect(store.summary.firstTryCount).toBe(1)
    expect(store.summary.afterRetryCount).toBe(2)
    expect(store.summary.retriedCount).toBe(1)
  })

  it('first-pass records are not changed by a retry', () => {
    const store = finishSet()
    const before = {
      attempts: [...store.attempts],
      wrong: [...store.wrongAttempts],
      hints: [...store.hintsShown],
      score: store.score,
    }
    store.retryProblem(0)
    store.submit('3 11/20')
    store.submit('3 9/20')
    expect(store.attempts).toEqual(before.attempts)
    expect(store.wrongAttempts).toEqual(before.wrong)
    expect(store.hintsShown).toEqual(before.hints)
    expect(store.score).toBe(before.score)
  })

  it('only missed problems can be retried', () => {
    const store = finishSet()
    store.retryProblem(1)
    expect(store.isRetry).toBe(false)
    expect(store.view).toBe('summary')
  })

  it('"retry all missed" walks through every missed problem, then returns to the summary', () => {
    const store = setup([sub, add, sub])
    store.submit('3 11/20')
    solveAndProve(store, '3 9/20')
    store.next()
    store.submit('1')
    solveAndProve(store, '6 3/4')
    store.next()
    solveAndProve(store, '3 9/20')
    store.next()
    leaveUnlock(store)
    expect(store.summary.missed).toEqual([0, 1])

    store.retryMissed()
    expect(store.current).toEqual(sub)
    solveAndProve(store, '3 9/20')
    expect(store.next()).toBe(true)
    expect(store.view).toBe('playing')
    expect(store.current).toEqual(add)
    solveAndProve(store, '6 3/4')
    expect(store.next()).toBe(true)
    expect(store.view).toBe('summary')
    expect(store.summary.afterRetryCount).toBe(3)
    expect(store.summary.firstTryCount).toBe(1)
  })

  it('can leave a retry without solving it', () => {
    const store = finishSet()
    store.retryProblem(0)
    store.backToSummary()
    expect(store.view).toBe('summary')
    expect(store.retryCorrect[0]).toBe(false)
  })
})

describe('try one like it', () => {
  it('runs a similar problem without changing the score or the problem underneath', () => {
    const store = setup()
    store.submit('3 11/20')
    const before = { attempts: store.attempts[0], wrong: store.wrongAttempts[0], score: store.score }

    store.startSimilar(store.current!, () => 0.3)
    expect(store.isSimilar).toBe(true)
    expect(store.view).toBe('playing')
    expect(store.current?.op).toBe('subtract')
    expect(store.current).not.toEqual(sub)

    // She solves it like a normal problem (the engine gives the right answer to type).
    const similar = store.current!
    expect(store.submit('0')).toBe('wrong')
    expect(store.submit(formatMixed(subtract(similar.a, similar.b)))).toBe('correct')
    expect(store.submitProof(formatMixed(similar.a))).toBe('correct')
    expect(store.next()).toBe(true)

    // Back on the original problem, exactly as she left it.
    expect(store.isSimilar).toBe(false)
    expect(store.current).toEqual(sub)
    expect(store.feedback?.kind).toBe('wrong')
    expect(store.attempts[0]).toBe(before.attempts)
    expect(store.wrongAttempts[0]).toBe(before.wrong)
    expect(store.score).toBe(before.score)
  })

  it('can be left with endSimilar', () => {
    const store = setup()
    store.startSimilar(sub, () => 0.6)
    store.endSimilar()
    expect(store.isSimilar).toBe(false)
    expect(store.current).toEqual(sub)
  })
})

describe('tone', () => {
  const words = (text: string) => text.trim().split(/\s+/).length

  it('success messages vary and never repeat back to back', () => {
    const store = setup(Array.from({ length: 12 }, () => sub))
    const seen: string[] = []
    for (let i = 0; i < 12; i++) {
      store.submit('3 9/20')
      store.submitProof('8 1/5') // the first two are proved before the result shows
      seen.push(store.feedback!.message)
      store.next()
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
    expect(new Set(seen).size).toBeGreaterThan(1)
    for (const m of seen) expect(words(m)).toBeLessThanOrEqual(12)
  })

  it('never shows the same hint twice in a row', () => {
    const store = setup()
    const shown: string[] = []
    for (let i = 0; i < 6; i++) {
      store.submit('3 11/20')
      const fb = store.feedback
      if (fb?.kind !== 'wrong') throw new Error('expected wrong feedback')
      shown.push(fb.hints.at(-1)!)
      if (fb.moreHints) {
        store.nextHint()
        const after = store.feedback
        if (after?.kind !== 'wrong') throw new Error('expected wrong feedback')
        shown.push(after.hints.at(-1)!)
      }
    }
    for (let i = 1; i < shown.length; i++) expect(shown[i]).not.toBe(shown[i - 1])
  })

  it('hints and wrong messages are short', () => {
    const store = setup()
    store.submit('3 11/20')
    store.nextHint()
    const fb = store.feedback
    if (fb?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(words(fb.message)).toBeLessThanOrEqual(12)
    for (const hint of fb.hints) expect(words(hint)).toBeLessThanOrEqual(12)
  })
})

describe('Learn bookkeeping', () => {
  it('opening Learn counts as help for the problem', () => {
    const store = setup()
    store.submit('3 11/20')
    store.markLearned()
    expect(store.learned[0]).toBe(true)
    store.submit('3 9/20')
    store.submitProof('8 1/5')
    expect(store.status[0]).toBe('correctWithHelp')
    expect(store.currentMissedAnswer).toBe('3 11/20')
    expect(store.lastMissed[0]).toBe('3 11/20')
  })
})

describe('story problems', () => {
  it('start() with stories wraps every problem in a story, same numbers', () => {
    const store = usePracticeStore()
    store.start({ op: 'mixed', needsRegroup: false, stories: true }, () => 0.42)
    expect(store.problems).toHaveLength(SET_SIZE)
    for (const p of store.problems) {
      expect(p.story).toBeTruthy()
      expect(p.topic).toBeTruthy()
    }
  })

  it('without stories the problems have none', () => {
    const store = usePracticeStore()
    store.start({ op: 'add', needsRegroup: false }, () => 0.42)
    expect(store.problems.every((p) => p.story === undefined)).toBe(true)
  })

  it('grades a story problem exactly like a plain one', () => {
    const store = setup([withStory(sub), withStory(add)])
    expect(store.submit('3 11/20')).toBe('wrong')
    expect(store.submit('3 9/20')).toBe('correct')
    expect(store.proof?.equation).toBe('3 9/20 + 4 3/4 = ?')
  })

  it('"try one like it" keeps the story style', () => {
    const store = setup([withStory(sub)])
    store.startSimilar(store.current!, () => 0.4)
    expect(store.current?.story).toBeTruthy()
    expect(store.current?.op).toBe('subtract')
  })
})

describe('real-world ideas at the end of a set', () => {
  function finish() {
    const store = setup([sub])
    solveAndProve(store, '3 9/20')
    store.next()
    return store
  }

  it('shows the real-world screen after the last problem, before the summary', () => {
    const store = finish()
    expect(store.finished).toBe(true)
    expect(store.view).toBe('unlock')
    expect(store.examplesSubmitted).toBe(false)
    store.continueToSummary() // can't skip past the question without answering or skipping
    expect(store.view).toBe('unlock')
  })

  it('her ideas wait for a parent: no credit until stars are given', () => {
    const store = finish()
    store.submitExamples([
      'Cutting a ribbon for a gift',
      'Sharing a pizza with my family',
      'Measuring flour when I bake',
    ])
    expect(store.ideaReviews).toHaveLength(3)
    expect(store.ideaReviews.every((r) => r.approved === null)).toBe(true)
    expect(store.extraCredit).toBe(0)
    expect(store.extraPending).toBe(3)
    expect(store.pendingReviewCount).toBe(3)
    expect(store.unlockCards).toHaveLength(3)
    expect(store.unlockCards.every((c) => c.mine)).toBe(true)
    store.continueToSummary()
    expect(store.view).toBe('summary')
    expect(store.summary.firstTryCount).toBe(1)
  })

  it('a parent gives a star per idea: 3, 2, 1 or none', () => {
    const store = finish()
    store.submitExamples(['Cutting a ribbon for a gift', 'Sharing a pizza with my family', 'Measuring flour'])
    const [a, b, c] = store.ideaReviews
    store.reviewIdea(a!.id, true)
    expect(store.extraCredit).toBe(1)
    store.reviewIdea(b!.id, true)
    store.reviewIdea(c!.id, true)
    expect(store.extraCredit).toBe(3)
    expect(store.extraPending).toBe(0)
    expect(store.pendingReviewCount).toBe(0)
    store.reviewIdea(b!.id, false)
    expect(store.extraCredit).toBe(2)
    store.reviewIdea(a!.id, false)
    store.reviewIdea(c!.id, false)
    expect(store.extraCredit).toBe(0)
    expect(store.extraPending).toBe(0)
  })

  it('1 or 2 ideas: the app fills the rest of the cards', () => {
    for (const ideas of [
      ['Cutting a ribbon for a gift'],
      ['Cutting a ribbon for a gift', 'Sharing a pizza with my family'],
    ]) {
      setActivePinia(createPinia())
      const store = finish()
      store.submitExamples(ideas)
      expect(store.ideaReviews).toHaveLength(ideas.length)
      expect(store.unlockCards).toHaveLength(3)
      expect(store.unlockCards.filter((c) => c.mine)).toHaveLength(ideas.length)
      expect(store.unlockCards.filter((c) => !c.mine)).toHaveLength(3 - ideas.length)
    }
  })

  it('no ideas: nothing to review, and the app shares 3 of its own', () => {
    const store = finish()
    store.skipExamples()
    expect(store.ideaReviews).toHaveLength(0)
    expect(store.extraCredit).toBe(0)
    expect(store.extraPending).toBe(0)
    expect(store.unlockCards).toHaveLength(3)
    expect(store.unlockCards.every((c) => !c.mine)).toBe(true)
    expect(new Set(store.unlockCards.map((c) => c.text)).size).toBe(3)
  })

  it('blank and repeated ideas are not sent to the parent', () => {
    const store = finish()
    store.submitExamples(['', 'Cutting a ribbon for a gift', 'cutting a RIBBON for a gift!', '   '])
    expect(store.ideaReviews.map((r) => r.text)).toEqual(['Cutting a ribbon for a gift'])
  })

  it('ideas can only be submitted once per set', () => {
    const store = finish()
    store.submitExamples(['Cutting a ribbon for a gift'])
    store.submitExamples(['Sharing a pizza with my family', 'Measuring flour when I bake'])
    expect(store.ideaReviews).toHaveLength(1)
  })

  it('reviewing an unknown idea does nothing', () => {
    const store = finish()
    store.submitExamples(['Cutting a ribbon for a gift'])
    store.reviewIdea(999, true)
    expect(store.extraCredit).toBe(0)
  })

  it('a new set starts with no credit, but earlier ideas still wait for the parent', () => {
    const store = finish()
    store.submitExamples(['Cutting a ribbon for a gift'])
    store.reviewIdea(store.ideaReviews[0]!.id, true)
    expect(store.extraCredit).toBe(1)
    store.startWith([sub])
    expect(store.extraCredit).toBe(0)
    expect(store.examplesSubmitted).toBe(false)
    expect(store.view).toBe('playing')
    expect(store.ideaReviews).toHaveLength(1)
  })

  it('ideas from two sets are kept apart and each set shows its own credit', () => {
    const store = finish()
    store.submitExamples(['Cutting a ribbon for a gift'])
    store.startWith([sub])
    solveAndProve(store, '3 9/20')
    store.next()
    store.submitExamples(['Sharing a pizza with my family'])
    expect(store.ideaReviews.map((r) => r.set)).toEqual([1, 2])
    expect(new Set(store.ideaReviews.map((r) => r.id)).size).toBe(2)
    expect(store.pendingReviewCount).toBe(2)
    expect(store.extraPending).toBe(1)
    store.reviewIdea(store.ideaReviews[1]!.id, true)
    expect(store.extraCredit).toBe(1)
    expect(store.pendingReviewCount).toBe(1)
  })
})

describe('proofs are asked on the first 2 problems of each type', () => {
  it('asks for a proof on the first two problems of a type and requires it', () => {
    const store = setup([add, add, add])
    store.submit('6 3/4')
    expect(store.proof).not.toBeNull()
    expect(store.canAdvance).toBe(false)
    expect(store.next()).toBe(false)
    store.submitProof('4 1/3')
    expect(store.next()).toBe(true)

    store.submit('6 3/4')
    expect(store.proof).not.toBeNull() // second add problem
    expect(store.canAdvance).toBe(false)
    store.submitProof('4 1/3')
    expect(store.next()).toBe(true)
  })

  it('after two, later problems of that type have no proof and no skip needed', () => {
    const store = setup([add, add, add])
    solveAndProve(store, '6 3/4')
    store.next()
    solveAndProve(store, '6 3/4')
    store.next()

    store.submit('6 3/4')
    expect(store.proof).toBeNull()
    expect(store.canAdvance).toBe(true)
    expect(store.submitProof('4 1/3')).toBeNull()
    expect(store.proofsAsked).toEqual({ add: 2, subtract: 0, multiply: 0, divide: 0 })
    expect(store.next()).toBe(true)
  })

  it('counts each type separately', () => {
    const store = setup([add, add, sub, sub, sub])
    for (const answer of ['6 3/4', '6 3/4', '3 9/20', '3 9/20']) {
      solveAndProve(store, answer)
      store.next()
    }
    expect(store.proofsAsked).toEqual({ add: 2, subtract: 2, multiply: 0, divide: 0 })
    store.submit('3 9/20')
    expect(store.proof).toBeNull() // third subtraction
  })

  it('the proof hint says the right thing for each type', () => {
    const subStore = setup([sub])
    subStore.submit('3 9/20')
    subStore.submitProof('9')
    expect(subStore.proof?.hint).toContain('undo subtracting')

    setActivePinia(createPinia())
    const addStore = setup([add])
    addStore.submit('6 3/4')
    addStore.submitProof('9')
    expect(addStore.proof?.hint).toContain('undo adding')
  })

  it('applies to retries and similar problems too', () => {
    const store = setup([sub, sub, sub])
    store.submit('1')
    solveAndProve(store, '3 9/20')
    store.next()
    solveAndProve(store, '3 9/20')
    store.next()
    solveAndProve(store, '3 9/20') // third: no proof
    store.next()
    leaveUnlock(store)
    store.retryProblem(0)
    store.submit('3 9/20')
    expect(store.proof).toBeNull() // two subtraction proofs already used
    expect(store.next()).toBe(true)
  })
})

describe('proof streak and badge', () => {
  const four = [sub, sub, add, add]

  it('grows with each proof done without help', () => {
    const store = setup(four)
    for (let i = 0; i < 2; i++) {
      solveAndProve(store, '3 9/20')
      store.next()
    }
    expect(store.proofStreak).toBe(2)
    expect(store.proofMaster).toBe(false)
  })

  it('earns Proof Master at 3 in a row', () => {
    const store = setup(four)
    for (const answer of ['3 9/20', '3 9/20', '6 3/4']) {
      solveAndProve(store, answer)
      store.next()
    }
    expect(store.proofStreak).toBe(3)
    expect(store.proofMaster).toBe(true)
  })

  it('a proof that needed help resets the streak', () => {
    const store = setup(four)
    solveAndProve(store, '3 9/20')
    store.next()
    expect(store.proofStreak).toBe(1)
    store.submit('3 9/20')
    store.submitProof('9') // wrong, hint
    store.submitProof('8 1/5') // right, but only after help
    expect(store.proofStreak).toBe(0)
  })

  it('a nudge about simplest form does not break the streak', () => {
    const store = setup(four)
    solveAndProve(store, '3 9/20')
    store.next()
    store.submit('3 9/20')
    store.submitProof('41/5')
    store.submitProof('8 1/5')
    expect(store.proofStreak).toBe(2)
  })

  it('keeps the badge once earned, even if the streak resets later', () => {
    const store = setup([sub, sub, add, add])
    for (const answer of ['3 9/20', '3 9/20', '6 3/4']) {
      solveAndProve(store, answer)
      store.next()
    }
    store.submit('6 3/4')
    store.submitProof('9')
    store.submitProof('9')
    expect(store.proofStreak).toBe(0)
    expect(store.proofMaster).toBe(true)
  })
})

describe('after three hints, she adds her wrong answer back', () => {
  /** wrong answer, ask for another hint, wrong again: that is three hints in total. */
  function threeHints(store: ReturnType<typeof usePracticeStore>, wrong = '3 11/20') {
    store.submit(wrong)
    store.nextHint()
    store.submit(wrong)
  }

  it('is not offered before the third hint', () => {
    const store = setup()
    store.submit('3 11/20')
    expect(store.wrongCheck).toBeNull()
    store.nextHint()
    expect(store.wrongCheck).toBeNull()
  })

  it('appears after the third hint with her answer in the opposite equation', () => {
    const store = setup()
    threeHints(store)
    expect(store.wrongCheck?.equation).toBe('3 11/20 + 4 3/4 = ?')
  })

  it('also appears when she skips "another hint" but gets three wrong answers', () => {
    const store = setup()
    store.submit('3 11/20')
    store.submit('3 11/20')
    expect(store.wrongCheck).toBeNull() // two hints so far
    store.submit('3 11/20')
    expect(store.wrongCheck).not.toBeNull()
  })

  it('uses the other operation for addition problems', () => {
    const store = setup([add])
    threeHints(store, '6 1/2')
    expect(store.wrongCheck?.equation).toBe('6 1/2 − 2 5/12 = ?')
  })

  it('a correct add-back shows what it gave versus where we started', () => {
    const store = setup()
    threeHints(store)
    // 3 11/20 + 4 3/4 = 8 3/10, not 8 1/5
    expect(store.submitWrongCheck('8 3/10')).toBe('correct')
    expect(store.wrongCheck?.done).toBe(true)
    expect(store.wrongCheck?.message).toBe('That makes 8 3/10. We started with 8 1/5.')
    expect(store.isSolved).toBe(false) // she still has to fix her own answer
  })

  it('a wrong add-back gets a hint, then the worked add-back after two tries', () => {
    const store = setup()
    threeHints(store)
    expect(store.submitWrongCheck('1')).toBe('wrong')
    expect(store.wrongCheck?.done).toBe(false)
    expect(store.wrongCheck?.hint).toContain('undo subtracting')
    expect(store.submitWrongCheck('2')).toBe('wrong')
    expect(store.wrongCheck?.done).toBe(true)
    expect(store.wrongCheck?.steps.length).toBeGreaterThan(0)
    expect(store.wrongCheck?.message).toContain('We started with 8 1/5')
  })

  it('an equal but not simplest add-back is only a nudge', () => {
    const store = setup()
    threeHints(store)
    expect(store.submitWrongCheck('83/10')).toBe('correctNotSimplest')
    expect(store.wrongCheck?.done).toBe(false)
  })

  it('starts fresh with each new wrong answer and disappears once she is right', () => {
    const store = setup()
    threeHints(store)
    store.submitWrongCheck('8 3/10')
    const firstRound = store.wrongCheck!.round
    store.submit('3 12/20')
    expect(store.wrongCheck?.done).toBe(false)
    expect(store.wrongCheck?.round).not.toBe(firstRound)
    store.submit('3 9/20')
    expect(store.wrongCheck).toBeNull()
  })

  it('is not offered when her answer cannot be added back', () => {
    const store = setup([add])
    // 1/4 - 2 5/12 would go below zero for the add-back, so it is skipped.
    threeHints(store, '1/4')
    expect(store.wrongCheck).toBeNull()
    setActivePinia(createPinia())
    const store2 = setup()
    threeHints(store2, '1/0') // unreadable
    expect(store2.wrongCheck).toBeNull()
  })

  it('does not change the proof streak or the score', () => {
    const store = setup()
    threeHints(store)
    store.submitWrongCheck('8 3/10')
    expect(store.proofStreak).toBe(0)
    expect(store.score).toBe(0)
  })
})

describe('mixing up the operation (story problems)', () => {
  it('hints at the operation, not the numbers, when she adds instead of subtracts', () => {
    const store = setup([withStory(sub)])
    // 8 1/5 + 4 3/4 = 12 19/20
    expect(store.submit('12 19/20')).toBe('wrong')
    const fb = store.feedback
    if (fb?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(fb.hints[0]).toBe('Are we putting together or taking away?')
    store.nextHint()
    const after = store.feedback
    if (after?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(after.hints[1]).toBe('Words like “in all” add. Words like “left” subtract.')
  })

  it('also catches subtracting instead of adding', () => {
    const store = setup([withStory(add)])
    // 4 1/3 - 2 5/12 = 1 11/12
    store.submit('1 11/12')
    const fb = store.feedback
    if (fb?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(fb.hints[0]).toBe('Are we putting together or taking away?')
  })
})

describe('test navigation: skip, back and submit', () => {
  const three = [sub, add, sub]

  it('skips an unsolved problem and moves on without scoring it', () => {
    const store = setup(three)
    expect(store.canSkip).toBe(true)
    expect(store.skip()).toBe(true)
    expect(store.index).toBe(1)
    expect(store.score).toBe(0)
    expect(store.status[0]).toBe('unanswered')
    expect(store.unansweredCount).toBe(3)
  })

  it('cannot skip a solved problem (Next is used instead) or the last problem', () => {
    const store = setup(three)
    store.submit('3 9/20')
    expect(store.canSkip).toBe(false)
    expect(store.skip()).toBe(false)
    store.submitProof('8 1/5')
    store.next()
    expect(store.index).toBe(1)
    store.skip() // problem 2 is not solved, so it can be skipped
    expect(store.isLastProblem).toBe(true)
    expect(store.canSkip).toBe(false)
    expect(store.skip()).toBe(false)
  })

  it('goes back and forth and keeps each problem as she left it', () => {
    const store = setup(three)
    store.submit('3 11/20') // wrong on problem 1, hint showing
    store.skip()
    expect(store.canGoBack).toBe(true)
    store.back()
    expect(store.index).toBe(0)
    expect(store.feedback?.kind).toBe('wrong')
    expect(store.wrongAttempts[0]).toBe(1)
    expect(store.back()).toBe(false) // already at the first problem
  })

  it('keeps what she typed in the answer boxes for each problem', () => {
    const store = setup(three)
    store.setDraft({ whole: '3', num: '9', den: '' })
    store.skip()
    expect(store.draft).toEqual({ whole: '', num: '', den: '' })
    store.setDraft({ whole: '6', num: '', den: '' })
    store.back()
    expect(store.draft).toEqual({ whole: '3', num: '9', den: '' })
    store.skip()
    expect(store.draft.whole).toBe('6')
  })

  it('a correct problem she revisits stays solved, with her answer and result', () => {
    const store = setup(three)
    solveAndProve(store, '3 9/20')
    store.next()
    store.back()
    expect(store.isSolved).toBe(true)
    expect(store.feedback?.kind).toBe('correct')
    expect(store.submit('1')).toBeNull() // read-only
    expect(store.score).toBe(1)
    expect(store.works[0]!.solvedAnswer).toBe('3 9/20')
  })

  it('a skipped problem can be answered after coming back to it', () => {
    const store = setup(three)
    store.skip()
    solveAndProve(store, '6 3/4')
    store.back()
    expect(store.index).toBe(0)
    expect(store.submit('3 9/20')).toBe('correct')
    store.submitProof('8 1/5')
    expect(store.score).toBe(2)
    expect(store.firstTryCorrect[0]).toBe(true)
  })

  it('a solved problem with a proof waiting cannot be left forward, but Back still works', () => {
    const store = setup([sub, sub])
    store.submit('3 9/20')
    expect(store.proof?.done).toBe(false)
    expect(store.canLeaveForward).toBe(false)
    expect(store.next()).toBe(false)
    store.submitProof('8 1/5')
    expect(store.canLeaveForward).toBe(true)
    store.next()
    store.back()
    expect(store.index).toBe(0)
  })

  it('Submit is only on the last problem', () => {
    const store = setup(three)
    expect(store.canSubmit).toBe(false)
    expect(store.submitTest(true)).toBe(false)
    expect(store.finished).toBe(false)
    store.skip()
    store.skip()
    expect(store.isLastProblem).toBe(true)
    expect(store.canSubmit).toBe(true)
  })

  it('Submit with unanswered problems needs confirming, then counts them as missed', () => {
    const store = setup(three)
    store.skip()
    solveAndProve(store, '6 3/4')
    store.next()
    expect(store.isLastProblem).toBe(true)
    expect(store.unansweredCount).toBe(2)
    expect(store.submitTest()).toBe(false) // asks "Submit anyway?"
    expect(store.finished).toBe(false)
    expect(store.submitTest(true)).toBe(true)
    expect(store.finished).toBe(true)
    leaveUnlock(store)
    expect(store.summary.items.map((i) => i.correct)).toEqual([false, true, false])
    expect(store.summary.items.map((i) => i.unanswered)).toEqual([true, false, true])
    expect(store.summary.missed).toEqual([0, 2])
  })

  it('Submit with everything answered needs no confirmation', () => {
    const store = setup([sub, add])
    solveAndProve(store, '3 9/20')
    store.next()
    store.submit('6 3/4')
    store.submitProof('4 1/3')
    expect(store.unansweredCount).toBe(0)
    expect(store.canSubmit).toBe(true)
    expect(store.submitTest()).toBe(true)
    expect(store.view).toBe('unlock')
  })

  it('Submit waits for a pending proof on the last problem', () => {
    const store = setup([sub])
    store.submit('3 9/20')
    expect(store.canSubmit).toBe(false)
    store.submitProof('8 1/5')
    expect(store.canSubmit).toBe(true)
  })

  it('a skipped problem can be retried from the summary and counts as retry, not first try', () => {
    const store = setup([sub, add])
    store.skip()
    solveAndProve(store, '6 3/4')
    expect(store.submitTest()).toBe(false)
    expect(store.submitTest(true)).toBe(true)
    leaveUnlock(store)
    store.retryProblem(0)
    solveAndProve(store, '3 9/20')
    store.next()
    expect(store.retryCorrect).toEqual([true, false])
    expect(store.firstTryCorrect).toEqual([false, true])
    expect(store.summary.firstTryCount).toBe(1)
    expect(store.summary.afterRetryCount).toBe(2)
  })

  it('has no Back or Skip during a retry', () => {
    const store = setup([sub, add])
    store.skip()
    solveAndProve(store, '6 3/4')
    store.back()
    solveAndProve(store, '3 9/20')
    store.next()
    expect(store.submitTest()).toBe(true) // everything answered
    leaveUnlock(store)
    expect(store.canNavigate).toBe(false) // summary
    store.retryProblem(0) // not missed, so this does nothing
    expect(store.isRetry).toBe(false)
  })

  it('a retry has no Back or Skip of its own', () => {
    const store = setup([sub, add])
    store.submit('1') // wrong, then solved later so it is a missed problem
    solveAndProve(store, '3 9/20')
    store.next()
    solveAndProve(store, '6 3/4')
    store.submitTest()
    leaveUnlock(store)
    store.retryProblem(0)
    expect(store.isRetry).toBe(true)
    expect(store.canGoBack).toBe(false)
    expect(store.canSkip).toBe(false)
    expect(store.canSubmit).toBe(false)
  })

  it('"try one like it" has its own state and no navigation', () => {
    const store = setup(three)
    store.skip()
    store.startSimilar(store.current!, () => 0.4)
    expect(store.canNavigate).toBe(false)
    expect(store.canSkip).toBe(false)
    expect(store.canGoBack).toBe(false)
    store.endSimilar()
    expect(store.index).toBe(1)
    expect(store.canGoBack).toBe(true)
  })

  it('each problem has its own rough-work page', () => {
    const store = setup(three)
    const first = store.scratchKey
    store.skip()
    expect(store.scratchKey).not.toBe(first)
    store.back()
    expect(store.scratchKey).toBe(first)
    store.startSimilar(store.current!, () => 0.4)
    const similarKey = store.scratchKey
    expect(similarKey).toMatch(/^similar-/)
    store.endSimilar()
    store.startSimilar(store.current!, () => 0.4)
    expect(store.scratchKey).not.toBe(similarKey) // a new similar problem gets a fresh page
  })
})

describe('proof comes before the verdict on the first problems of each type', () => {
  it('a correct answer is not announced until she has proved it', () => {
    const store = setup()
    store.submit('3 9/20')
    expect(store.feedback).toBeNull()
    expect(store.isSolved).toBe(false)
    expect(store.proof).not.toBeNull()
    expect(store.canAdvance).toBe(false)
    store.submitProof('8 1/5')
    expect(store.feedback?.kind).toBe('correct')
    expect(store.canAdvance).toBe(true)
  })

  it('a wrong answer still gets "Not quite" and a hint right away', () => {
    const store = setup()
    expect(store.submit('3 11/20')).toBe('wrong')
    expect(store.feedback?.kind).toBe('wrong')
    expect(store.proof).toBeNull()
    expect(store.proofPending).toBe(false)
  })

  it('a wrong proof gets a hint, and the result is still held back', () => {
    const store = setup()
    store.submit('3 9/20')
    store.submitProof('9')
    expect(store.proof?.hint).toContain('undo subtracting')
    expect(store.feedback).toBeNull()
    expect(store.score).toBe(0)
  })

  it('after two wrong proofs the worked add-back shows, and then she is told it was right', () => {
    const store = setup()
    store.submit('3 9/20')
    store.submitProof('9')
    store.submitProof('8')
    expect(store.proof?.steps.length).toBeGreaterThan(0)
    expect(store.isSolved).toBe(true)
    expect(store.feedback?.kind).toBe('correct')
    expect(store.score).toBe(1)
    // The answer itself needed no help; only the proof did (that resets the streak).
    expect(store.status[0]).toBe('correct')
    expect(store.firstTryCorrect[0]).toBe(true)
    expect(store.proofStreak).toBe(0)
  })

  it('first try is remembered while the proof is pending', () => {
    const store = setup()
    store.submit('3 9/20')
    expect(store.firstTryCorrect[0]).toBe(false) // not revealed yet
    store.submitProof('8 1/5')
    expect(store.firstTryCorrect[0]).toBe(true)
  })

  it('a later correct answer after a wrong one is not a first try', () => {
    const store = setup()
    store.submit('3 11/20')
    store.submit('3 9/20')
    store.submitProof('8 1/5')
    expect(store.firstTryCorrect[0]).toBe(false)
    expect(store.status[0]).toBe('correctWithHelp')
  })

  it('cannot skip, move on or submit while the proof is pending, but Back still works', () => {
    const store = setup([sub, sub, sub])
    store.skip()
    store.submit('3 9/20')
    expect(store.canSkip).toBe(false)
    expect(store.canLeaveForward).toBe(false)
    expect(store.next()).toBe(false)
    expect(store.canGoBack).toBe(true)
    store.back()
    store.skip()
    expect(store.proofPending).toBe(true) // still waiting for her proof when she returns
    store.submitProof('8 1/5')
    expect(store.canLeaveForward).toBe(true)
  })

  it('after the first two of a type, a correct answer is announced right away', () => {
    const store = setup([add, add, add])
    for (let i = 0; i < 2; i++) {
      store.submit('6 3/4')
      expect(store.feedback).toBeNull()
      store.submitProof('4 1/3')
      store.next()
    }
    store.submit('6 3/4')
    expect(store.proofPending).toBe(false)
    expect(store.feedback?.kind).toBe('correct')
    expect(store.canAdvance).toBe(true)
  })

  it('the result counts only once, in retries too', () => {
    const store = setup([sub])
    store.submit('1')
    store.submit('3 9/20')
    store.submitProof('8 1/5')
    store.next()
    leaveUnlock(store)
    expect(store.score).toBe(1)
    store.retryProblem(0)
    store.submit('3 9/20')
    expect(store.retryCorrect[0]).toBe(false) // second subtraction: proof first
    store.submitProof('8 1/5')
    expect(store.retryCorrect[0]).toBe(true)
    expect(store.score).toBe(1)
  })
})

describe('a slip in the proof is not a slip in her answer', () => {
  it('a wrong proof gets an encouraging line saying the slip is in the check, plus the hint', () => {
    const store = setup()
    store.submit('3 9/20')
    store.submitProof('9')
    expect(store.proof?.encouragement).toBeTruthy()
    expect(PROOF_SLIP_MESSAGES).toContain(store.proof!.encouragement)
    expect(store.proof?.hint).toMatch(/\?$/)
    // The answer itself is not marked wrong, and she is not told the result yet.
    expect(store.feedback).toBeNull()
    expect(store.wrongAttempts[0]).toBe(0)
    expect(store.proofPending).toBe(true)
  })

  it('varies across proofs in one session', () => {
    const store = setup(Array.from({ length: 2 }, () => sub))
    store.submit('3 9/20')
    store.submitProof('9')
    const first = store.proof!.encouragement
    store.submitProof('8 1/5')
    store.next()
    store.submit('3 9/20')
    store.submitProof('9')
    expect(store.proof!.encouragement).not.toBe(first)
  })

  it('after two wrong proofs she gets the worked add-back and is told her answer was right', () => {
    const store = setup()
    store.submit('3 9/20')
    store.submitProof('9')
    store.submitProof('8')
    expect(store.proof?.steps.length).toBeGreaterThan(0)
    expect(store.feedback?.kind).toBe('correct')
    expect(store.score).toBe(1)
  })

  it('a nudge about simplest form is not treated as a slip', () => {
    const store = setup()
    store.submit('3 9/20')
    store.submitProof('41/5')
    expect(store.proof?.encouragement).toBeNull()
  })
})

describe('multiplication and division in Practice', () => {
  const mul: MulProblem = { op: 'multiply', a: { whole: 2, num: 1, den: 2 }, b: { whole: 3, num: 1, den: 3 } } // 8 1/3
  const div: MulProblem = { op: 'divide', a: { whole: 0, num: 2, den: 3 }, b: { whole: 0, num: 4, den: 9 } } // 1 1/2
  const half: MulProblem = { op: 'multiply', a: { whole: 6, num: 0, den: 1 }, b: { whole: 0, num: 1, den: 2 } } // 3

  it('multiply: the proof is the division check, and a correct proof reveals the result', () => {
    const store = setup([mul])
    expect(store.submit('8 1/3')).toBe('correct')
    expect(store.feedback).toBeNull() // proof first
    expect(store.proof?.equation).toBe('8 1/3 ÷ 3 1/3 = ?')
    expect(store.submitProof('2 1/2')).toBe('correct')
    expect(store.feedback?.kind).toBe('correct')
    expect(store.score).toBe(1)
  })

  it('divide: the proof multiplies back', () => {
    const store = setup([div])
    store.submit('1 1/2')
    expect(store.proof?.equation).toBe('1 1/2 × 4/9 = ?')
    expect(store.submitProof('2/3')).toBe('correct')
  })

  it('proof hints use the right words for each operation', () => {
    const m = setup([mul])
    m.submit('8 1/3')
    m.submitProof('9')
    expect(m.proof?.hint).toContain('undo multiplying')
    setActivePinia(createPinia())
    const d = setup([div])
    d.submit('1 1/2')
    d.submitProof('9')
    expect(d.proof?.hint).toContain('undo dividing')
  })

  it('counts proofs for each of the four operations separately', () => {
    const store = setup([mul, mul, mul, div as Problem])
    for (const [answer, proof] of [['8 1/3', '2 1/2'], ['8 1/3', '2 1/2']] as const) {
      store.submit(answer)
      store.submitProof(proof)
      store.next()
    }
    expect(store.proofsAsked).toEqual({ add: 0, subtract: 0, multiply: 2, divide: 0 })
    store.submit('8 1/3')
    expect(store.proof).toBeNull() // third multiplication: no proof
    store.submitProof('2 1/2')
    store.next()
    store.submit('1 1/2')
    expect(store.proof).not.toBeNull() // first division: asked
  })

  it('a wrong divide answer gets the engine hint about flipping, then a nudge at the flip step', () => {
    const store = setup([div])
    expect(store.submit('8/27')).toBe('wrong')
    const fb = store.feedback
    if (fb?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(fb.hints[0]).toBe('What do you do to the second fraction when you divide?')
    store.nextHint()
    const after = store.feedback
    if (after?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(after.hints[1]).toBe('Which fraction do you flip when you divide?')
  })

  it('"Show me the steps" reveals the new steps one at a time, without the answer step', () => {
    const store = setup([div])
    store.submit('8/27')
    store.submit('1/3')
    for (let i = 0; i < 10; i++) store.showSteps()
    const fb = store.feedback
    if (fb?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(fb.steps.map((s) => s.kind)).toEqual(['flip', 'cancel', 'multiplyAcross', 'toMixed'])
    expect(fb.moreSteps).toBe(false)
  })

  it('after three hints a wrong divide answer is added back with multiplication', () => {
    const store = setup([div])
    store.submit('8/27')
    store.nextHint()
    store.submit('8/27')
    expect(store.wrongCheck?.equation).toBe('8/27 × 4/9 = ?')
    expect(store.submitWrongCheck('32/243')).toBe('correct')
    expect(store.wrongCheck?.message).toBe('That makes 32/243. We started with 2/3.')
  })

  it('the size rule: 6 x 1/2 answered as 12 gets the engine message', () => {
    const store = setup([half])
    expect(store.submit('12')).toBe('wrong')
    const fb = store.feedback
    if (fb?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(fb.sizeMessage).toBe('1/2 is less than 1, so multiplying makes 6 smaller. Check your answer.')
  })

  it('the size message goes away when the new answer is the right size, and never shows for add or subtract', () => {
    const store = setup([half])
    store.submit('12')
    store.submit('2')
    const fb = store.feedback
    if (fb?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(fb.sizeMessage).toBe('') // 2 is smaller than 6, so the size is fine (it is just not 3)
    setActivePinia(createPinia())
    const sub = setup([SUB_PROBLEM])
    sub.submit('99')
    const subFb = sub.feedback
    if (subFb?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(subFb.sizeMessage).toBe('')
  })

  it('divide size rule: 6 ÷ 1/2 answered as 3', () => {
    const store = setup([{ op: 'divide', a: { whole: 6, num: 0, den: 1 }, b: { whole: 0, num: 1, den: 2 } }])
    store.submit('3')
    const fb = store.feedback
    if (fb?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(fb.sizeMessage).toBe('1/2 is less than 1, so dividing makes 6 bigger. Check your answer.')
  })

  it('retry works for a missed multiplication', () => {
    const store = setup([mul])
    store.submit('6 1/6')
    store.submit('8 1/3')
    store.submitProof('2 1/2')
    store.next()
    leaveUnlock(store)
    expect(store.summary.missed).toEqual([0])
    store.retryProblem(0)
    store.submit('8 1/3')
    store.submitProof('2 1/2')
    expect(store.retryCorrect).toEqual([true])
  })

  it('"try one like it" stays at the same level and operation', () => {
    const store = setup([div])
    store.startSimilar(store.current!, () => 0.3)
    expect(store.current?.op).toBe('divide')
    const like = store.current as unknown as { a: MixedNumber; b: MixedNumber }
    expect(like.a.whole).toBe(0)
    expect(like.b.whole).toBe(0)
  })

  it('start() with each new operation makes ten valid problems', () => {
    for (const op of ['multiply', 'divide', 'all'] as const) {
      setActivePinia(createPinia())
      const store = usePracticeStore()
      store.start({ op, needsRegroup: false, stories: true }, () => 0.37)
      expect(store.problems).toHaveLength(SET_SIZE)
      for (const p of store.problems) {
        expect(p.story).toBeTruthy()
        expect(problemAnswer(p)).not.toBeNull()
      }
    }
  })

  it('the end-of-set ideas work after a multiplication and division set', () => {
    const store = setup([mul])
    store.submit('8 1/3')
    store.submitProof('2 1/2')
    store.next()
    store.skipExamples()
    expect(store.unlockCards).toHaveLength(3)
  })
})

describe('wrong operation hints for multiplication and division', () => {
  const times: MulProblem = { op: 'multiply', a: { whole: 0, num: 2, den: 3 }, b: { whole: 0, num: 3, den: 4 } } // 1/2
  const over: MulProblem = { op: 'divide', a: { whole: 6, num: 0, den: 1 }, b: { whole: 0, num: 2, den: 3 } } // 9

  function hintsFor(problem: MulProblem, wrong: string) {
    const store = setup([withStory(problem)])
    store.submit(wrong)
    store.nextHint()
    const fb = store.feedback
    if (fb?.kind !== 'wrong') throw new Error('expected wrong feedback')
    return fb.hints
  }

  it('multiplying answered by adding: repeated addition first, then clue words for multiplying', () => {
    expect(hintsFor(times, '1 5/12')).toEqual([
      'Multiplying is repeated adding. How many times should you add it?',
      'Words like “each”, “of” and “times” point to multiplying.',
    ])
  })

  it('dividing answered by subtracting: part or split first, then clue words for dividing', () => {
    expect(hintsFor(over, '5 1/3')).toEqual([
      'Are we taking a part of it, or splitting it up?',
      'Words like “shared equally” and “how many fit” point to dividing.',
    ])
  })

  it('the hint is about the operation, so it is the same hint for a story and for plain numbers', () => {
    const plain = setup([times])
    plain.submit('1 5/12')
    const fb = plain.feedback
    if (fb?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(fb.hints[0]).toBe('Multiplying is repeated adding. How many times should you add it?')
  })
})
