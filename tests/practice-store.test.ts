import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { formatMixed, subtract, type Problem } from '../app/utils/fraction'
import { SET_SIZE, usePracticeStore } from '../app/stores/practice'
import { withStory } from '../app/utils/stories'

const sub: Problem = { op: 'subtract', a: { whole: 8, num: 1, den: 5 }, b: { whole: 4, num: 3, den: 4 } } // 3 9/20
const add: Problem = { op: 'add', a: { whole: 4, num: 1, den: 3 }, b: { whole: 2, num: 5, den: 12 } } // 6 3/4

/** After the last problem she sees the real-world screen; skip through it to reach the summary. */
function leaveUnlock(store: ReturnType<typeof usePracticeStore>) {
  store.skipExamples()
  store.continueToSummary()
}

function setup(list: Problem[] = [sub, add]) {
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
    expect(store.score).toBe(1)
    expect(store.status[0]).toBe('correct')
    expect(store.attempts[0]).toBe(1)
    expect(store.hintsShown[0]).toBe(0)
    expect(store.feedback?.kind).toBe('correct')
    expect(store.proof?.equation).toBe('3 9/20 + 4 3/4 = ?')
    // She has to prove it before moving on.
    expect(store.next()).toBe(false)
    expect(store.submitProof('8 1/5')).toBe('correct')
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
    expect(store.status[0]).toBe('correctWithHelp')
    store.submitProof('8 1/5')
    store.next()
    expect(store.submit('6 3/4')).toBe('correct')
    expect(store.status[1]).toBe('correct')
    store.submitProof('4 1/3')
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
    expect(store.retryCorrect).toEqual([true, false])
    expect(store.firstTryCorrect).toEqual([false, true])
    store.submitProof('8 1/5')
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
      seen.push(store.feedback!.message)
      store.submitProof('8 1/5')
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
    expect(store.proofsAsked).toEqual({ add: 2, subtract: 0 })
    expect(store.next()).toBe(true)
  })

  it('counts each type separately', () => {
    const store = setup([add, add, sub, sub, sub])
    for (const answer of ['6 3/4', '6 3/4', '3 9/20', '3 9/20']) {
      solveAndProve(store, answer)
      store.next()
    }
    expect(store.proofsAsked).toEqual({ add: 2, subtract: 2 })
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
