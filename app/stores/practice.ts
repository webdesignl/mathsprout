import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  add,
  addSteps,
  checkAnswer,
  diagnose,
  formatMixed,
  inverseProblem,
  isNegative,
  parseMixed,
  subtract,
  toImproper,
  subtractSteps,
  type AnswerStatus,
  type Op,
  type Operand,
  type Problem,
  type Step,
} from '../utils/fraction'
import {
  GENERIC_STEP_HINT,
  SLIP_NUDGES,
  NOT_SIMPLEST_MESSAGE,
  PROOF_SLIP_MESSAGES,
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
import type { AnswerBoxes } from '../utils/answer'
import { buildUnlockCards, cleanExamples, type UnlockCard } from '../utils/realWorld'
import { withStory, type PracticeProblem } from '../utils/stories'

export const SET_SIZE = 10
export const MAX_DENOMINATOR = 12
/** Proofs done without help, in a row, to earn the badge. */
export const PROOF_MASTER_AT = 3
/** Proofs are asked on this many problems of each type (add, subtract); after that, none. */
export const PROOFS_PER_TYPE = 2
/** After this many hints on a wrong answer, she proves her own answer by adding it back. */
export const HINTS_BEFORE_CHECK = 3

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

/** Adding her wrong answer back, to see that it doesn't give the starting number. */
export interface WrongCheck {
  /** Changes with every new wrong answer, so the panel starts fresh. */
  round: number
  /** Her answer put back into the opposite equation, e.g. "3 11/20 + 4 3/4 = ?". */
  equation: string
  done: boolean
  /** 'wrong' while she is still working out the add-back; 'correctNotSimplest' is a gentle nudge. */
  result: AnswerStatus | null
  hint: string | null
  /** The worked add-back, shown after two wrong tries. */
  steps: Step[]
  /** Short line shown once she has the add-back: what it gave versus where we started. */
  message: string
}

export interface Proof {
  /** The opposite equation she fills in, e.g. "3 9/20 + 4 3/4 = ?". */
  equation: string
  done: boolean
  /** Last proof answer: 'wrong' or 'notSimplest' while she is still working. */
  result: AnswerStatus | null
  hint: string | null
  /** A short encouraging line when her proof has a slip (the slip is in the proof, not her answer). */
  encouragement: string | null
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
  /** She never submitted an answer for this problem (skipped or left blank). */
  unanswered: boolean
}

/** Wrong answers before the app offers the worked steps. */
const WRONG_BEFORE_STEPS = 2
/** Wrong proofs before the worked add-back is shown. */
const WRONG_PROOFS_BEFORE_STEPS = 2

interface ProofWork {
  wrong: number
  hint: string | null
  encouragement: string | null
  steps: Step[]
  result: AnswerStatus | null
  done: boolean
  helped: boolean
}

interface WrongCheckWork {
  wrong: number
  result: AnswerStatus | null
  hint: string | null
  steps: Step[]
  done: boolean
  message: string
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
  /** Every hint shown on this problem (the first on each wrong answer, plus extra ones she asks for). */
  hintEvents: number
  /** Her latest answer that wasn't fully right; Learn compares against it. */
  lastAnswer: string
  message: string
  /** What she typed in the three boxes, kept while she moves between problems. */
  draft: AnswerBoxes
  /** The answer that was accepted, shown when she revisits a solved problem. */
  solvedAnswer: string
  /**
   * Her answer is right but she hasn't been told yet: on the first problems of each type she proves it
   * first, and only then sees "Correct!".
   */
  pendingProof: boolean
  /** Her first submission was the right answer (applied when the result is revealed). */
  firstTry: boolean
  /** Whether this problem asks her to prove a correct answer (first 2 of each type). */
  proofAsked: boolean
  proof: ProofWork
  wrongCheck: WrongCheckWork
}

function newWrongCheck(): WrongCheckWork {
  return { wrong: 0, result: null, hint: null, steps: [], done: false, message: '' }
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
    hintEvents: 0,
    lastAnswer: '',
    message: '',
    draft: { whole: '', num: '', den: '' },
    solvedAnswer: '',
    pendingProof: false,
    firstTry: false,
    proofAsked: false,
    proof: { wrong: 0, hint: null, encouragement: null, steps: [], result: null, done: false, helped: false },
    wrongCheck: newWrongCheck(),
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
  /** How many proofs have been asked so far for each type of problem. */
  const proofsAsked = ref<Record<Op, number>>({ add: 0, subtract: 0 })

  /** One saved state per problem in the first pass, so she can skip, go back and forth. */
  const works = ref<Work[]>([])
  /** The state of a problem reopened from the summary. */
  const retryWork = ref<Work>(newWork())
  /** A missed problem reopened from the summary, plus the missed ones still waiting. */
  const retry = ref<{ index: number; queue: number[] } | null>(null)
  /** A "try one like it" problem. Its own work, so the problem underneath is left as it was. */
  const similar = ref<{ problem: PracticeProblem; work: Work } | null>(null)

  /** Counts "try one like it" problems, so each gets its own rough-work page. */
  const similarCount = ref(0)
  const lastHint = ref<string | null>(null)
  const lastSuccess = ref<string | null>(null)
  const lastWrongMessage = ref<string | null>(null)
  const lastProofSlip = ref<string | null>(null)

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
  const activeWork = computed<Work>(() => {
    if (similar.value) return similar.value.work
    if (retry.value) return retryWork.value
    return works.value[index.value] ?? newWork()
  })

  const isSolved = computed(() => activeWork.value.solved)
  /** She answered correctly but must prove it before she is told so. */
  const proofPending = computed(() => activeWork.value.pendingProof)
  const isSimilar = computed(() => similar.value !== null)
  const isRetry = computed(() => retry.value !== null && similar.value === null)
  const lastIndex = computed(() => problems.value.length - 1)
  /** Only the first pass has free navigation; retries and "try one like it" have their own Back button. */
  const canNavigate = computed(() => inFirstPass.value && problems.value.length > 0)
  const isLastProblem = computed(() => canNavigate.value && index.value === lastIndex.value)
  /** Problems she has not solved yet (skipped, not started, or still wrong). */
  const unansweredCount = computed(() => works.value.filter((w) => !w.solved).length)
  /** Moving on needs the proof only when this problem asked for one. */
  const canAdvance = computed(
    () => activeWork.value.solved && (!activeWork.value.proofAsked || activeWork.value.proof.done),
  )
  /** A solved problem with a pending proof can't be left going forward (Back is still fine). */
  const canLeaveForward = computed(
    () => !activeWork.value.pendingProof && (!activeWork.value.solved || canAdvance.value),
  )
  const canGoBack = computed(() => canNavigate.value && index.value > 0)
  const canSkip = computed(
    () =>
      canNavigate.value &&
      !isLastProblem.value &&
      !activeWork.value.solved &&
      !activeWork.value.pendingProof,
  )
  /** Submit is for the last problem, and not while a proof is waiting. */
  const canSubmit = computed(() => isLastProblem.value && canLeaveForward.value)
  /** Where her rough work for the problem on screen is kept. */
  const scratchKey = computed(() => {
    if (similar.value) return `similar-${similarCount.value}`
    if (retry.value) return `retry-${retry.value.index}`
    return `set-${index.value}`
  })
  /** What she typed in the answer boxes for the problem on screen. */
  const draft = computed(() => activeWork.value.draft)
  /** The accepted answer for a solved problem, shown when she revisits it. */
  const solvedAnswer = computed(() => activeWork.value.solvedAnswer)
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
    if (!problem || !(w.solved || w.pendingProof) || !w.proofAsked) return null
    const inverse = inverseProblem(problem)
    const symbol = inverse.op === 'add' ? '+' : '−'
    return {
      equation: `${formatMixed(inverse.a)} ${symbol} ${formatMixed(inverse.b)} = ?`,
      done: w.proof.done,
      result: w.proof.result,
      hint: w.proof.hint,
      encouragement: w.proof.encouragement,
      steps: w.proof.steps,
      helped: w.proof.helped,
    }
  })

  /**
   * After a wrong answer and three hints, she adds her own answer back. It does not give the starting
   * number, which shows her answer is off. Not offered when her answer can't be put back (unreadable,
   * or it would make a negative number).
   */
  const wrongCheck = computed<WrongCheck | null>(() => {
    const problem = current.value
    const w = activeWork.value
    if (!problem || w.solved || w.lastResult !== 'wrong' || w.hintEvents < HINTS_BEFORE_CHECK) return null
    const inverse = herInverse(problem, w.lastAnswer)
    if (!inverse) return null
    const symbol = inverse.op === 'add' ? '+' : '−'
    return {
      round: w.attempts,
      equation: `${formatMixed(inverse.a)} ${symbol} ${formatMixed(inverse.b)} = ?`,
      done: w.wrongCheck.done,
      result: w.wrongCheck.result,
      hint: w.wrongCheck.hint,
      steps: w.wrongCheck.steps,
      message: w.wrongCheck.message,
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
        unanswered: (attempts.value[i] ?? 0) === 0,
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
    const w = works.value[i]
    if (!w) return
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
    works.value = list.map(() => newWork())
    retryWork.value = newWork()
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

  /** Tells her the answer was right and records it (score, first try, retry). */
  function reveal(w: Work) {
    w.pendingProof = false
    w.solved = true
    w.lastResult = 'correct'
    w.message = lastSuccess.value = pickDifferent(SUCCESS_MESSAGES, lastSuccess.value)
    if (inFirstPass.value) {
      const i = index.value
      const neededHelp = w.wrongAttempts > 0 || w.hintsShown > 0 || w.stepsShown > 0 || w.learned
      status.value[i] = neededHelp ? 'correctWithHelp' : 'correct'
      if (w.firstTry) firstTryCorrect.value[i] = true
      score.value += 1
    } else if (retry.value && !similar.value) {
      retryCorrect.value[retry.value.index] = true
    }
  }

  /** Checks the typed answer. Code decides correctness. Returns null when nothing was checked. */
  function submit(answer: string): AnswerStatus | null {
    const problem = current.value
    const w = activeWork.value
    if (!problem || w.solved || w.pendingProof || answer.trim() === '') return null

    const firstSubmission = w.attempts === 0
    w.attempts += 1
    const result = checkAnswer(answerOf(problem), answer)
    w.lastResult = result.status

    if (result.status === 'correct') {
      w.solvedAnswer = answer.trim()
      w.hintTexts = []
      w.firstTry = firstSubmission
      // Proofs are asked on the first few problems of each type, then not at all.
      w.proofAsked = proofsAsked.value[problem.op] < PROOFS_PER_TYPE
      if (w.proofAsked) {
        proofsAsked.value[problem.op] += 1
        // Hold back "Correct!": she proves it first, so she isn't tempted to skip it once she knows.
        w.pendingProof = true
        w.lastResult = null
      } else {
        reveal(w)
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
        w.hintEvents += 1
        w.wrongCheck = newWrongCheck()
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
      w.hintEvents += 1
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
    if (!problem || !(w.solved || w.pendingProof) || !w.proofAsked || w.proof.done || answer.trim() === '') {
      return null
    }

    const inverse = inverseProblem(problem)
    const result = checkAnswer(answerOf(inverse), answer)
    w.proof.result = result.status

    if (result.status === 'correct') {
      w.proof.done = true
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
        // Her answer was right; the slip is in the proof. Say so, and give a hint about the check.
        w.proof.encouragement = lastProofSlip.value = pickDifferent(PROOF_SLIP_MESSAGES, lastProofSlip.value)
        w.proof.hint = proofHint(problem.op, formatMixed(inverse.b))
      }
    }
    // Once the proof is finished, she is told her answer was right.
    if (w.proof.done && w.pendingProof) reveal(w)
    sync()
    return result.status
  }

  /**
   * Checks the add-back of her wrong answer. Once she has it right, a short line shows what it gave
   * versus where we started. Two wrong tries show the worked add-back.
   */
  function submitWrongCheck(answer: string): AnswerStatus | null {
    const problem = current.value
    const w = activeWork.value
    if (!problem || !wrongCheck.value || w.wrongCheck.done || answer.trim() === '') return null

    const inverse = herInverse(problem, w.lastAnswer)!
    const expected = answerOf(inverse)
    const result = checkAnswer(expected, answer)
    w.wrongCheck.result = result.status

    if (result.status === 'correct') {
      w.wrongCheck.done = true
      w.wrongCheck.message = `That makes ${formatMixed(expected)}. We started with ${formatMixed(problem.a)}.`
    } else if (result.status === 'wrong') {
      w.wrongCheck.wrong += 1
      if (w.wrongCheck.wrong >= WRONG_PROOFS_BEFORE_STEPS) {
        w.wrongCheck.steps = stepsOf(inverse)
        w.wrongCheck.done = true
        w.wrongCheck.message = `That makes ${formatMixed(expected)}. We started with ${formatMixed(problem.a)}.`
      } else {
        w.wrongCheck.hint = proofHint(problem.op, formatMixed(inverse.b))
      }
    }
    return result.status
  }

  /** Goes to the previous problem. Her work on both problems is kept. */
  function back(): boolean {
    if (!canGoBack.value) return false
    index.value -= 1
    return true
  }

  /** Moves past a problem she hasn't solved. She can come back to it later. */
  function skip(): boolean {
    if (!canSkip.value) return false
    index.value += 1
    return true
  }

  /**
   * Finishes the test from the last problem. Returns false when problems are unanswered and she hasn't
   * confirmed yet (the page then asks "Submit anyway?"). Unanswered problems count as missed.
   */
  function submitTest(confirmed = false): boolean {
    if (!canSubmit.value) return false
    if (unansweredCount.value > 0 && !confirmed) return false
    finished.value = true
    return true
  }

  /** Keeps what she has typed so it is still there when she comes back to this problem. */
  function setDraft(boxes: AnswerBoxes) {
    activeWork.value.draft = { ...boxes }
  }

  /** Moves on once the problem is solved and, when asked, proved. Returns false if not ready. */
  function next(): boolean {
    if (!current.value || !canAdvance.value) return false

    if (similar.value) {
      similar.value = null
      return true
    }
    if (retry.value) {
      const [following, ...rest] = retry.value.queue
      retry.value = following === undefined ? null : { index: following, queue: rest }
      retryWork.value = newWork()
      return true
    }
    if (index.value >= problems.value.length - 1) {
      finished.value = true
    } else {
      index.value += 1
    }
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
    retryWork.value = newWork()
  }

  /** Reopens every missed problem, one after another. */
  function retryMissed() {
    if (!unlockDone.value) return
    const [first, ...rest] = summary.value.missed
    if (first === undefined) return
    similar.value = null
    retry.value = { index: first, queue: rest }
    retryWork.value = newWork()
  }

  /** Leaves a retry and goes back to the summary. */
  function backToSummary() {
    retry.value = null
    similar.value = null
    retryWork.value = newWork()
  }

  /** "Try one like it": a new problem with the same operation and regroup setting. Doesn't change the score. */
  function startSimilar(base?: PracticeProblem, rng: Random = Math.random) {
    const source = base ?? current.value
    if (!source) return
    const like = generateSimilarProblem(source, MAX_DENOMINATOR, rng)
    const hasStory = 'story' in source && source.story !== undefined
    similarCount.value += 1
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
    works.value = []
    retryWork.value = newWork()
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
    proofsAsked,
    works,
    retryWork,
    retry,
    similar,
    similarCount,
    lastHint,
    lastSuccess,
    lastWrongMessage,
    lastProofSlip,
    total,
    current,
    view,
    isSolved,
    proofPending,
    isSimilar,
    isRetry,
    canAdvance,
    canNavigate,
    canLeaveForward,
    isLastProblem,
    unansweredCount,
    canGoBack,
    canSkip,
    canSubmit,
    scratchKey,
    draft,
    solvedAnswer,
    currentMissedAnswer,
    feedback,
    proof,
    wrongCheck,
    summary,
    needsHelp,
    start,
    startWith,
    submit,
    nextHint,
    showSteps,
    markLearned,
    submitProof,
    submitWrongCheck,
    submitExamples,
    reviewIdea,
    skipExamples,
    continueToSummary,
    next,
    back,
    skip,
    submitTest,
    setDraft,
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
  const nudge = SLIP_NUDGES[diagnosis.slip] ?? (step ? STEP_HINTS[step.kind] : GENERIC_STEP_HINT)
  const hints = [diagnosis.hint, nudge]
  return hints[0] === previous ? [hints[1]!, hints[0]!] : hints
}

/**
 * Her wrong answer put into the opposite equation (her answer + b, or her answer - b).
 * Null when her answer can't be read, or the add-back would go below zero (she can't type that).
 */
function herInverse(problem: Problem, answerText: string): Problem | null {
  const typed = parseMixed(answerText)
  if (!typed) return null
  const inverse = inverseProblem(problem, toImproper(typed))
  return isNegative(answerOf(inverse)) ? null : inverse
}
