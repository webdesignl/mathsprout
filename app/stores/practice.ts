import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  add,
  addSteps,
  checkAnswer,
  diagnose,
  formatMixed,
  inverseProblem,
  subtract,
  subtractSteps,
  type AnswerStatus,
  type Op,
  type Operand,
  type Problem,
  type Step,
} from '../utils/fraction'
import {
  GENERIC_STEP_HINT,
  NOT_SIMPLEST_MESSAGE,
  STEP_HINTS,
  SUCCESS_MESSAGES,
  WRONG_MESSAGES,
  pickDifferent,
  proofHint,
} from '../utils/messages'
import {
  generateProblem,
  generateSimilarProblem,
  type ProblemOp,
  type Random,
} from '../utils/problems'
import { buildUnlockCards, cleanExamples, type UnlockCard } from '../utils/realWorld'
import { withStory, type PracticeProblem } from '../utils/stories'

export const SET_SIZE = 10
export const MAX_DENOMINATOR = 12
/** Proofs done without help, in a row, to earn the badge. */
export const PROOF_MASTER_AT = 5

export interface PracticeOptions {
  op: ProblemOp
  needsRegroup: boolean
  /** Wrap each problem in a short story. The numbers and the answer stay the same. */
  stories?: boolean
}

export type ProblemStatus = 'unanswered' | 'correct' | 'correctWithHelp'

export type Feedback =
  | { kind: 'correct'; message: string }
  | { kind: 'notSimplest'; message: string }
  | {
      kind: 'wrong'
      message: string
      hints: string[]
      moreHints: boolean
      canShowSteps: boolean
      steps: Step[]
      moreSteps: boolean
    }

export interface Proof {
  /** The opposite equation she fills in, e.g. "3 9/20 + 4 3/4 = ?". */
  equation: string
  done: boolean
  /** Last proof answer: 'wrong' or 'notSimplest' while she is still working. */
  result: AnswerStatus | null
  hint: string | null
  /** The worked add-back, shown after two wrong proofs. */
  steps: Step[]
  helped: boolean
}

/** One of her real-world ideas, waiting for (or given) a parent's star. */
export interface IdeaReview {
  id: number
  /** Which set it came from, so each set can show its own extra credit. */
  set: number
  text: string
  /** null until a parent decides. */
  approved: boolean | null
}

export type View = 'idle' | 'playing' | 'unlock' | 'summary'

export interface SummaryItem {
  number: number
  index: number
  problem: Problem
  firstTry: boolean
  retryCorrect: boolean
  /** Right on the first try, or right after a retry. */
  correct: boolean
  wrongAttempts: number
  hintsShown: number
  stepsShown: number
}

/** Wrong answers before the app offers the worked steps. */
const WRONG_BEFORE_STEPS = 2
/** Wrong proofs before the worked add-back is shown. */
const WRONG_PROOFS_BEFORE_STEPS = 2

interface ProofWork {
  wrong: number
  hint: string | null
  steps: Step[]
  result: AnswerStatus | null
  done: boolean
  helped: boolean
}

/** Live state for the problem on screen (a set problem, a retry, or a "try one like it"). */
interface Work {
  attempts: number
  wrongAttempts: number
  /** Most hints she has seen for this problem (for the summary). */
  hintsShown: number
  /** Hints on screen right now; each new wrong answer starts again at one fresh hint. */
  hintsVisible: number
  stepsShown: number
  solved: boolean
  learned: boolean
  lastResult: AnswerStatus | null
  hintTexts: string[]
  /** Her latest answer that wasn't fully right; Learn compares against it. */
  lastAnswer: string
  message: string
  proof: ProofWork
}

function newWork(): Work {
  return {
    attempts: 0,
    wrongAttempts: 0,
    hintsShown: 0,
    hintsVisible: 0,
    stepsShown: 0,
    solved: false,
    learned: false,
    lastResult: null,
    hintTexts: [],
    lastAnswer: '',
    message: '',
    proof: { wrong: 0, hint: null, steps: [], result: null, done: false, helped: false },
  }
}

function answerOf(problem: Problem): Operand {
  return (problem.op === 'add' ? add : subtract)(problem.a, problem.b)
}

function stepsOf(problem: Problem): Step[] {
  return problem.op === 'add' ? addSteps(problem.a, problem.b) : subtractSteps(problem.a, problem.b)
}

/** Steps a student may be shown. The final "answer" step is left out so she still finishes it herself. */
function revealableSteps(problem: Problem): Step[] {
  return stepsOf(problem).filter((s) => s.kind !== 'answer')
}

export const usePracticeStore = defineStore('practice', () => {
  const options = ref<PracticeOptions>({ op: 'add', needsRegroup: false })
  const problems = ref<PracticeProblem[]>([])
  const index = ref(0)

  // Records for the first pass through the set (what the summary reports).
  /** Every submission per problem (including "equal but not simplest"). */
  const attempts = ref<number[]>([])
  /** Only the wrong submissions per problem. */
  const wrongAttempts = ref<number[]>([])
  const hintsShown = ref<number[]>([])
  const stepsShown = ref<number[]>([])
  const status = ref<ProblemStatus[]>([])
  const learned = ref<boolean[]>([])
  /** The first submission was fully right. */
  const firstTryCorrect = ref<boolean[]>([])
  /** Solved during a retry from the summary. Kept apart from firstTryCorrect. */
  const retryCorrect = ref<boolean[]>([])
  /** Her latest not-fully-right answer in the first pass, for Learn on the summary. */
  const lastMissed = ref<string[]>([])
  const score = ref(0)
  const finished = ref(false)

  // End-of-set reward: real-world ideas, extra credit and knowledge cards.
  /** Ideas stay here across sets (this browser tab only, nothing is saved yet) until a parent reviews them. */
  const ideaReviews = ref<IdeaReview[]>([])
  const setNumber = ref(0)
  const unlockCards = ref<UnlockCard[]>([])
  const examplesSubmitted = ref(false)
  const unlockDone = ref(false)

  const proofStreak = ref(0)
  const proofMaster = ref(false)
  /** Operations she has already proved on her own. Proofs for those become optional. */
  const proofPassed = ref<Record<Op, boolean>>({ add: false, subtract: false })

  const work = ref<Work>(newWork())
  /** A missed problem reopened from the summary, plus the missed ones still waiting. */
  const retry = ref<{ index: number; queue: number[] } | null>(null)
  /** A "try one like it" problem. Its own work, so the problem underneath is left as it was. */
  const similar = ref<{ problem: PracticeProblem; work: Work } | null>(null)

  const lastHint = ref<string | null>(null)
  const lastSuccess = ref<string | null>(null)
  const lastWrongMessage = ref<string | null>(null)

  const total = computed(() => problems.value.length)
  /** Stars a parent has given for this set's ideas. */
  const extraCredit = computed(
    () => ideaReviews.value.filter((r) => r.set === setNumber.value && r.approved === true).length,
  )
  /** This set's ideas still waiting for a parent. */
  const extraPending = computed(
    () => ideaReviews.value.filter((r) => r.set === setNumber.value && r.approved === null).length,
  )
  /** Every idea still waiting for a parent, from any set. */
  const pendingReviewCount = computed(() => ideaReviews.value.filter((r) => r.approved === null).length)
  const activeIndex = computed(() => (retry.value ? retry.value.index : index.value))
  const inFirstPass = computed(() => !retry.value && !similar.value && !finished.value)

  const current = computed<PracticeProblem | null>(() => {
    if (similar.value) return similar.value.problem
    if (finished.value && !retry.value) return null
    return problems.value[activeIndex.value] ?? null
  })
  const activeWork = computed<Work>(() => (similar.value ? similar.value.work : work.value))

  const isSolved = computed(() => activeWork.value.solved)
  /** The first proof for each operation is required; after she passes it, proofs can be skipped. */
  const proofRequired = computed(() => {
    const problem = current.value
    return problem ? !proofPassed.value[problem.op] : true
  })
  const canSkipProof = computed(
    () => activeWork.value.solved && !activeWork.value.proof.done && !proofRequired.value,
  )
  const canAdvance = computed(
    () => activeWork.value.solved && (activeWork.value.proof.done || !proofRequired.value),
  )
  const isSimilar = computed(() => similar.value !== null)
  const isRetry = computed(() => retry.value !== null && similar.value === null)
  /** Her latest answer that wasn't fully right, for the Learn panel. */
  const currentMissedAnswer = computed(() => activeWork.value.lastAnswer)

  const view = computed<View>(() => {
    if (total.value === 0) return 'idle'
    if (similar.value || retry.value) return 'playing'
    if (finished.value) return unlockDone.value ? 'summary' : 'unlock'
    return 'playing'
  })

  const feedback = computed<Feedback | null>(() => {
    const problem = current.value
    const w = activeWork.value
    if (!problem || !w.lastResult) return null

    if (w.lastResult === 'correct') return { kind: 'correct', message: w.message }
    if (w.lastResult === 'correctNotSimplest') return { kind: 'notSimplest', message: NOT_SIMPLEST_MESSAGE }

    const steps = revealableSteps(problem)
    return {
      kind: 'wrong',
      message: w.message,
      hints: w.hintTexts.slice(0, w.hintsVisible),
      moreHints: w.hintsVisible < w.hintTexts.length,
      canShowSteps: w.wrongAttempts >= WRONG_BEFORE_STEPS,
      steps: steps.slice(0, w.stepsShown),
      moreSteps: w.stepsShown < steps.length,
    }
  })

  /** The "Prove it!" step, available once the problem is solved. */
  const proof = computed<Proof | null>(() => {
    const problem = current.value
    const w = activeWork.value
    if (!problem || !w.solved) return null
    const inverse = inverseProblem(problem)
    const symbol = inverse.op === 'add' ? '+' : '−'
    return {
      equation: `${formatMixed(inverse.a)} ${symbol} ${formatMixed(inverse.b)} = ?`,
      done: w.proof.done,
      result: w.proof.result,
      hint: w.proof.hint,
      steps: w.proof.steps,
      helped: w.proof.helped,
    }
  })

  /** The first-pass results with a retry on top, for the summary. */
  const summary = computed(() => {
    const items: SummaryItem[] = problems.value.map((problem, i) => {
      const firstTry = firstTryCorrect.value[i] ?? false
      const retried = retryCorrect.value[i] ?? false
      return {
        number: i + 1,
        index: i,
        problem,
        firstTry,
        retryCorrect: retried,
        correct: firstTry || retried,
        wrongAttempts: wrongAttempts.value[i] ?? 0,
        hintsShown: hintsShown.value[i] ?? 0,
        stepsShown: stepsShown.value[i] ?? 0,
      }
    })
    return {
      items,
      firstTryCount: items.filter((p) => p.firstTry).length,
      afterRetryCount: items.filter((p) => p.correct).length,
      retriedCount: items.filter((p) => p.retryCorrect).length,
      missed: items.filter((p) => !p.correct).map((p) => p.index),
    }
  })

  /** Problems that needed a wrong try, a hint, the steps or Learn, for the first-pass summary. */
  const needsHelp = computed(() =>
    summary.value.items.filter(
      (p) => p.wrongAttempts > 0 || p.hintsShown > 0 || p.stepsShown > 0 || learned.value[p.index],
    ),
  )

  /** Copies the live work into the first-pass records (only while she is in the first pass). */
  function sync() {
    if (!inFirstPass.value) return
    const i = index.value
    const w = work.value
    attempts.value[i] = w.attempts
    wrongAttempts.value[i] = w.wrongAttempts
    hintsShown.value[i] = w.hintsShown
    stepsShown.value[i] = w.stepsShown
    learned.value[i] = w.learned
    if (w.lastAnswer && w.lastResult !== 'correct') lastMissed.value[i] = w.lastAnswer
  }

  /** Starts a set from ready-made problems (also used by tests and, later, saved sets). */
  function startWith(list: Problem[], newOptions?: PracticeOptions) {
    if (newOptions) options.value = { ...newOptions }
    setNumber.value += 1
    problems.value = [...list]
    index.value = 0
    attempts.value = list.map(() => 0)
    wrongAttempts.value = list.map(() => 0)
    hintsShown.value = list.map(() => 0)
    stepsShown.value = list.map(() => 0)
    status.value = list.map(() => 'unanswered')
    learned.value = list.map(() => false)
    firstTryCorrect.value = list.map(() => false)
    retryCorrect.value = list.map(() => false)
    lastMissed.value = list.map(() => '')
    score.value = 0
    finished.value = false
    resetUnlock()
    retry.value = null
    similar.value = null
    work.value = newWork()
  }

  function resetUnlock() {
    unlockCards.value = []
    examplesSubmitted.value = false
    unlockDone.value = false
  }

  /** Starts a new set of SET_SIZE generated problems. */
  function start(newOptions: PracticeOptions, rng: Random = Math.random) {
    const list = Array.from({ length: SET_SIZE }, () => {
      const problem = generateProblem(
        { op: newOptions.op, maxDenominator: MAX_DENOMINATOR, needsRegroup: newOptions.needsRegroup },
        rng,
      )
      return newOptions.stories ? withStory(problem, rng) : problem
    })
    startWith(list, newOptions)
  }

  /** Checks the typed answer. Code decides correctness. Returns null when nothing was checked. */
  function submit(answer: string): AnswerStatus | null {
    const problem = current.value
    const w = activeWork.value
    if (!problem || w.solved || answer.trim() === '') return null

    const firstSubmission = w.attempts === 0
    w.attempts += 1
    const result = checkAnswer(answerOf(problem), answer)
    w.lastResult = result.status

    if (result.status === 'correct') {
      w.solved = true
      w.hintTexts = []
      w.message = lastSuccess.value = pickDifferent(SUCCESS_MESSAGES, lastSuccess.value)
      if (inFirstPass.value) {
        const i = index.value
        const neededHelp = w.wrongAttempts > 0 || w.hintsShown > 0 || w.stepsShown > 0 || w.learned
        status.value[i] = neededHelp ? 'correctWithHelp' : 'correct'
        if (firstSubmission) firstTryCorrect.value[i] = true
        score.value += 1
      } else if (retry.value && !similar.value) {
        retryCorrect.value[retry.value.index] = true
      }
    } else {
      w.lastAnswer = answer
      if (result.status === 'wrong') {
        w.wrongAttempts += 1
        w.message = lastWrongMessage.value = pickDifferent(WRONG_MESSAGES, lastWrongMessage.value)
        w.hintTexts = buildHints(problem, answer, lastHint.value)
        // The first hint question appears right away on a wrong answer.
        w.hintsVisible = 1
        w.hintsShown = Math.max(w.hintsShown, 1)
        lastHint.value = w.hintTexts[0] ?? lastHint.value
      }
    }
    sync()
    return result.status
  }

  /** Reveals one more hint for the current problem, if there is one. Hints never contain the answer. */
  function nextHint() {
    const w = activeWork.value
    if (w.lastResult !== 'wrong') return
    if (w.hintsVisible < w.hintTexts.length) {
      w.hintsVisible += 1
      w.hintsShown = Math.max(w.hintsShown, w.hintsVisible)
      lastHint.value = w.hintTexts[w.hintsVisible - 1] ?? lastHint.value
      sync()
    }
  }

  /** Reveals the next worked step. Only available after two wrong answers. */
  function showSteps() {
    const problem = current.value
    const w = activeWork.value
    if (!problem || w.solved || w.wrongAttempts < WRONG_BEFORE_STEPS) return
    if (w.stepsShown < revealableSteps(problem).length) {
      w.stepsShown += 1
      sync()
    }
  }

  /** Marks that she opened Learn for this problem, so the summary can show it needed help. */
  function markLearned() {
    activeWork.value.learned = true
    sync()
  }

  /**
   * Checks her proof (the opposite equation). A correct proof without help grows the streak.
   * One wrong proof gets a hint question; two get the worked add-back, and the streak resets.
   */
  function submitProof(answer: string): AnswerStatus | null {
    const problem = current.value
    const w = activeWork.value
    if (!problem || !w.solved || w.proof.done || answer.trim() === '') return null

    const inverse = inverseProblem(problem)
    const result = checkAnswer(answerOf(inverse), answer)
    w.proof.result = result.status

    if (result.status === 'correct') {
      w.proof.done = true
      // Getting it right herself (a hint is fine) passes this operation; the worked steps don't.
      proofPassed.value[problem.op] = true
      if (w.proof.helped) {
        proofStreak.value = 0
      } else {
        proofStreak.value += 1
        if (proofStreak.value >= PROOF_MASTER_AT) proofMaster.value = true
      }
    } else if (result.status === 'wrong') {
      w.proof.wrong += 1
      w.proof.helped = true
      if (w.proof.wrong >= WRONG_PROOFS_BEFORE_STEPS) {
        w.proof.steps = stepsOf(inverse)
        w.proof.done = true
        proofStreak.value = 0
      } else {
        w.proof.hint = proofHint(inverse.op, formatMixed(inverse.b))
      }
    }
    return result.status
  }

  /** Moves on once the problem is solved and proved (or the proof can be skipped). Returns false if not ready. */
  function next(): boolean {
    if (!current.value || !canAdvance.value) return false

    if (similar.value) {
      similar.value = null
      return true
    }
    if (retry.value) {
      const [following, ...rest] = retry.value.queue
      retry.value = following === undefined ? null : { index: following, queue: rest }
      work.value = newWork()
      return true
    }
    if (index.value >= problems.value.length - 1) {
      finished.value = true
    } else {
      index.value += 1
    }
    work.value = newWork()
    return true
  }

  /**
   * Her real-world ideas. They wait for a parent to give stars (see reviewIdea); code only tidies them.
   * Nothing is sent anywhere. The app then adds its own ideas so she unlocks 3 cards.
   */
  function submitExamples(inputs: string[], rng: Random = Math.random) {
    if (!finished.value || examplesSubmitted.value) return
    const mine = cleanExamples(inputs)
    const ops = [...new Set(problems.value.map((p) => p.op))]
    const topics = [...new Set(problems.value.flatMap((p) => (p.topic ? [p.topic] : [])))]
    const nextId = ideaReviews.value.reduce((max, r) => Math.max(max, r.id), 0) + 1
    ideaReviews.value.push(
      ...mine.map((text, i) => ({ id: nextId + i, set: setNumber.value, text, approved: null })),
    )
    unlockCards.value = buildUnlockCards(mine, ops, topics, rng)
    examplesSubmitted.value = true
  }

  /** A parent gives (or takes back) a star for one idea. */
  function reviewIdea(id: number, approved: boolean) {
    const review = ideaReviews.value.find((r) => r.id === id)
    if (review) review.approved = approved
  }

  /** She has no ideas right now: the app shares three, and there is nothing for a parent to review. */
  function skipExamples(rng: Random = Math.random) {
    submitExamples([], rng)
  }

  /** Leaves the reveal and goes to the summary. */
  function continueToSummary() {
    if (examplesSubmitted.value) unlockDone.value = true
  }

  /** Reopens one missed problem from the summary. */
  function retryProblem(i: number) {
    if (!unlockDone.value || summary.value.items[i]?.correct !== false) return
    similar.value = null
    retry.value = { index: i, queue: [] }
    work.value = newWork()
  }

  /** Reopens every missed problem, one after another. */
  function retryMissed() {
    if (!unlockDone.value) return
    const [first, ...rest] = summary.value.missed
    if (first === undefined) return
    similar.value = null
    retry.value = { index: first, queue: rest }
    work.value = newWork()
  }

  /** Leaves a retry and goes back to the summary. */
  function backToSummary() {
    retry.value = null
    similar.value = null
    work.value = newWork()
  }

  /** "Try one like it": a new problem with the same operation and regroup setting. Doesn't change the score. */
  function startSimilar(base?: PracticeProblem, rng: Random = Math.random) {
    const source = base ?? current.value
    if (!source) return
    const like = generateSimilarProblem(source, MAX_DENOMINATOR, rng)
    const hasStory = 'story' in source && source.story !== undefined
    similar.value = { problem: hasStory ? withStory(like, rng) : like, work: newWork() }
  }

  /** Leaves the "try one like it" problem and returns to where she was. */
  function endSimilar() {
    similar.value = null
  }

  function reset() {
    problems.value = []
    index.value = 0
    finished.value = false
    resetUnlock()
    score.value = 0
    retry.value = null
    similar.value = null
    work.value = newWork()
  }

  return {
    options,
    problems,
    index,
    attempts,
    wrongAttempts,
    hintsShown,
    stepsShown,
    status,
    learned,
    firstTryCorrect,
    retryCorrect,
    lastMissed,
    score,
    finished,
    ideaReviews,
    setNumber,
    extraCredit,
    extraPending,
    pendingReviewCount,
    unlockCards,
    examplesSubmitted,
    unlockDone,
    proofStreak,
    proofMaster,
    proofPassed,
    work,
    retry,
    similar,
    lastHint,
    lastSuccess,
    lastWrongMessage,
    total,
    current,
    view,
    isSolved,
    isSimilar,
    isRetry,
    canAdvance,
    proofRequired,
    canSkipProof,
    currentMissedAnswer,
    feedback,
    proof,
    summary,
    needsHelp,
    start,
    startWith,
    submit,
    nextHint,
    showSteps,
    markLearned,
    submitProof,
    submitExamples,
    reviewIdea,
    skipExamples,
    continueToSummary,
    next,
    retryProblem,
    retryMissed,
    backToSummary,
    startSimilar,
    endSimilar,
    reset,
  }
})

/**
 * The diagnose hint and a nudge toward the slip's step (one short question each).
 * Never repeats the hint she just saw: if the first one matches, the other goes first.
 */
function buildHints(problem: Problem, answer: string, previous: string | null): string[] {
  const diagnosis = diagnose(problem, answer)
  const step = diagnosis.stepIndex === null ? undefined : stepsOf(problem)[diagnosis.stepIndex]
  const nudge = step ? STEP_HINTS[step.kind] : GENERIC_STEP_HINT
  const hints = [diagnosis.hint, nudge]
  return hints[0] === previous ? [hints[1]!, hints[0]!] : hints
}
