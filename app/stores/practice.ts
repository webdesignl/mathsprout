import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  add,
  addSteps,
  checkAnswer,
  diagnose,
  subtract,
  subtractSteps,
  verifyByInverse,
  type AnswerStatus,
  type Operand,
  type Problem,
  type Step,
} from '../utils/fraction'
import { generateProblem, type ProblemOp, type Random } from '../utils/problems'

export const SET_SIZE = 10
export const MAX_DENOMINATOR = 12

export interface PracticeOptions {
  op: ProblemOp
  needsRegroup: boolean
}

export type ProblemStatus = 'unanswered' | 'correct' | 'correctWithHelp'

export type Feedback =
  | { kind: 'correct'; verify: { holds: boolean; expression: string } }
  | { kind: 'notSimplest' }
  | {
      kind: 'wrong'
      hints: string[]
      moreHints: boolean
      canShowSteps: boolean
      steps: Step[]
      moreSteps: boolean
    }

/** Wrong answers before the app offers the worked steps. */
const WRONG_BEFORE_STEPS = 2

function answerOf(problem: Problem): Operand {
  return (problem.op === 'add' ? add : subtract)(problem.a, problem.b)
}

/** Steps a student may be shown. The final "answer" step is left out so she still finishes it herself. */
function revealableSteps(problem: Problem): Step[] {
  const steps = problem.op === 'add' ? addSteps(problem.a, problem.b) : subtractSteps(problem.a, problem.b)
  return steps.filter((s) => s.kind !== 'answer')
}

export const usePracticeStore = defineStore('practice', () => {
  const options = ref<PracticeOptions>({ op: 'add', needsRegroup: false })
  const problems = ref<Problem[]>([])
  const index = ref(0)
  /** Every submission per problem (including "equal but not simplest"). */
  const attempts = ref<number[]>([])
  /** Only the wrong submissions per problem. */
  const wrongAttempts = ref<number[]>([])
  const hintsShown = ref<number[]>([])
  const stepsShown = ref<number[]>([])
  const status = ref<ProblemStatus[]>([])
  const score = ref(0)
  const finished = ref(false)
  const lastResult = ref<AnswerStatus | null>(null)
  /** Hints available for the current problem, built from the latest wrong answer. */
  const hintTexts = ref<string[]>([])

  const total = computed(() => problems.value.length)
  const current = computed<Problem | null>(() => problems.value[index.value] ?? null)
  const isSolved = computed(() => (status.value[index.value] ?? 'unanswered') !== 'unanswered')

  const feedback = computed<Feedback | null>(() => {
    const problem = current.value
    const i = index.value
    if (!problem || !lastResult.value) return null

    if (lastResult.value === 'correct') {
      const [a, b] = [problem.a, problem.b]
      return { kind: 'correct', verify: verifyByInverse(problem.op, a, b, answerOf(problem)) }
    }
    if (lastResult.value === 'correctNotSimplest') return { kind: 'notSimplest' }

    const steps = revealableSteps(problem)
    const shownHints = hintsShown.value[i] ?? 0
    const shownSteps = stepsShown.value[i] ?? 0
    return {
      kind: 'wrong',
      hints: hintTexts.value.slice(0, shownHints),
      moreHints: shownHints < hintTexts.value.length,
      canShowSteps: (wrongAttempts.value[i] ?? 0) >= WRONG_BEFORE_STEPS,
      steps: steps.slice(0, shownSteps),
      moreSteps: shownSteps < steps.length,
    }
  })

  /** Problems that needed a wrong try, a hint or the steps, for the end-of-set summary. */
  const needsHelp = computed(() =>
    problems.value
      .map((problem, i) => ({
        number: i + 1,
        problem,
        wrongAttempts: wrongAttempts.value[i] ?? 0,
        hintsShown: hintsShown.value[i] ?? 0,
        stepsShown: stepsShown.value[i] ?? 0,
      }))
      .filter((p) => p.wrongAttempts > 0 || p.hintsShown > 0 || p.stepsShown > 0),
  )

  /** Starts a set from ready-made problems (also used by tests and, later, saved sets). */
  function startWith(list: Problem[], newOptions?: PracticeOptions) {
    if (newOptions) options.value = { ...newOptions }
    problems.value = [...list]
    index.value = 0
    attempts.value = list.map(() => 0)
    wrongAttempts.value = list.map(() => 0)
    hintsShown.value = list.map(() => 0)
    stepsShown.value = list.map(() => 0)
    status.value = list.map(() => 'unanswered')
    score.value = 0
    finished.value = false
    resetFeedback()
  }

  /** Starts a new set of SET_SIZE generated problems. */
  function start(newOptions: PracticeOptions, rng: Random = Math.random) {
    const list = Array.from({ length: SET_SIZE }, () =>
      generateProblem(
        { op: newOptions.op, maxDenominator: MAX_DENOMINATOR, needsRegroup: newOptions.needsRegroup },
        rng,
      ),
    )
    startWith(list, newOptions)
  }

  function resetFeedback() {
    lastResult.value = null
    hintTexts.value = []
  }

  /** Checks the typed answer. Code decides correctness. Returns null when nothing was checked. */
  function submit(answer: string): AnswerStatus | null {
    const problem = current.value
    const i = index.value
    if (!problem || isSolved.value || finished.value || answer.trim() === '') return null

    attempts.value[i] = (attempts.value[i] ?? 0) + 1
    const result = checkAnswer(answerOf(problem), answer)
    lastResult.value = result.status

    if (result.status === 'correct') {
      const neededHelp =
        (wrongAttempts.value[i] ?? 0) > 0 || (hintsShown.value[i] ?? 0) > 0 || (stepsShown.value[i] ?? 0) > 0
      status.value[i] = neededHelp ? 'correctWithHelp' : 'correct'
      score.value += 1
      hintTexts.value = []
    } else if (result.status === 'wrong') {
      wrongAttempts.value[i] = (wrongAttempts.value[i] ?? 0) + 1
      const diagnosis = diagnose(problem, answer)
      hintTexts.value = buildHints(problem, diagnosis.hint, diagnosis.stepIndex)
      // The first hint question appears right away on a wrong answer.
      hintsShown.value[i] = Math.max(hintsShown.value[i] ?? 0, 1)
    }
    return result.status
  }

  /** Reveals one more hint for the current problem, if there is one. Hints never contain the answer. */
  function nextHint() {
    const i = index.value
    if (lastResult.value !== 'wrong') return
    if ((hintsShown.value[i] ?? 0) < hintTexts.value.length) {
      hintsShown.value[i] = (hintsShown.value[i] ?? 0) + 1
    }
  }

  /** Reveals the next worked step. Only available after two wrong answers. */
  function showSteps() {
    const problem = current.value
    const i = index.value
    if (!problem || isSolved.value || (wrongAttempts.value[i] ?? 0) < WRONG_BEFORE_STEPS) return
    if ((stepsShown.value[i] ?? 0) < revealableSteps(problem).length) {
      stepsShown.value[i] = (stepsShown.value[i] ?? 0) + 1
    }
  }

  /** Moves on once the current problem is solved. Returns false if it is not solved yet. */
  function next(): boolean {
    if (!isSolved.value || finished.value) return false
    if (index.value >= problems.value.length - 1) {
      finished.value = true
    } else {
      index.value += 1
    }
    resetFeedback()
    return true
  }

  function reset() {
    problems.value = []
    index.value = 0
    finished.value = false
    score.value = 0
    resetFeedback()
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
    score,
    finished,
    total,
    current,
    isSolved,
    feedback,
    needsHelp,
    start,
    startWith,
    submit,
    nextHint,
    showSteps,
    next,
    reset,
  }
})

/** The diagnose hint first, then a nudge toward the step where the slip happened (description only). */
function buildHints(problem: Problem, hint: string, stepIndex: number | null): string[] {
  const hints = [hint]
  const step = stepIndex === null ? undefined : (problem.op === 'add'
    ? addSteps(problem.a, problem.b)
    : subtractSteps(problem.a, problem.b))[stepIndex]
  hints.push(
    step
      ? `Think about this step: ${step.description} Can you try it again?`
      : 'Try again one step at a time. What do you do first when the denominators are different?',
  )
  return hints
}
