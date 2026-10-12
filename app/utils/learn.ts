import {
  addSteps,
  diagnose,
  parseMixed,
  subtractSteps,
  type Problem,
  type Slip,
  type Step,
} from './fraction'
import { slipName } from './messages'

export interface LearnStep {
  step: Step
  /** True for the step where her answer went off. */
  highlighted: boolean
  /** A short note shown on the highlighted step. */
  note: string | null
}

export interface LearnContent {
  steps: LearnStep[]
  /** Index (into `steps`) of the step diagnose() points at, or null if there is none. */
  highlightIndex: number | null
  slip: Slip
  /** One short line naming the slip kindly, or null when we can't tell. */
  intro: string | null
}

const WHOLES = /^(\d+) ([+-]) (\d+) = (\d+)$/
const NUMERATORS = /^(\d+)\/(\d+) ([+-]) (\d+)\/\d+ = (\d+)\/\d+$/

function minus(symbol: string): string {
  return symbol === '-' ? '−' : symbol
}

/** Builds a short note for the step where the answer went off. Numbers come from the worked step itself. */
function noteFor(slip: Slip, step: Step, answer: string, index: number): string {
  const lead = index === 0 ? 'This is where it went off.' : 'Your answer matches until here.'
  const student = parseMixed(answer)

  if (slip === 'numeratorArithmetic' && student) {
    const m = NUMERATORS.exec(step.expression)
    if (m && Number(m[2]) === student.den) {
      return `${lead} ${m[1]} ${minus(m[3]!)} ${m[4]} = ${m[5]}, but your answer used ${student.num}.`
    }
  }
  if (slip === 'wholeArithmetic' && student) {
    const m = WHOLES.exec(step.expression)
    if (m) return `${lead} ${m[1]} ${minus(m[2]!)} ${m[3]} = ${m[4]}, but your answer used ${student.whole}.`
  }
  if (slip === 'forgotRegroup') return `${lead} Here we borrow 1 whole.`
  if (slip === 'addedDenominators' || slip === 'noCommonDenominator') {
    return `${lead} Make the bottom numbers match first.`
  }
  if (slip === 'notSimplified') return 'Your answer is equal. It just isn’t in simplest form.'
  return lead
}

/**
 * The correct method for a problem, step by step, with the step where her answer went off highlighted.
 * Uses the engine's worked steps and diagnose(); it does no fraction math of its own.
 */
export function buildLearn(problem: Problem, answer: string): LearnContent {
  const steps = problem.op === 'add' ? addSteps(problem.a, problem.b) : subtractSteps(problem.a, problem.b)
  const diagnosis = answer.trim() === '' ? null : diagnose(problem, answer)
  const index = diagnosis && diagnosis.slip !== 'none' ? diagnosis.stepIndex : null
  const slip = diagnosis?.slip ?? 'unknown'
  const name = slipName(slip, problem.op)

  return {
    steps: steps.map((step, i) => ({
      step,
      highlighted: i === index,
      note: i === index ? noteFor(slip, step, answer, i) : null,
    })),
    highlightIndex: index,
    slip,
    intro: name ? `That looks like ${name}.` : null,
  }
}
