import { diagnose, parseMixed, workedSteps, type AnyProblem, type Slip, type Step } from './fraction'
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
  if (slip === 'forgotReciprocal') return `${lead} Here we flip the second fraction.`
  if (slip === 'flippedWrongFraction') return `${lead} The second fraction is the one to flip.`
  if (slip === 'multipliedPartsSeparately' || slip === 'forgotToConvertMixed') {
    return `${lead} Mixed numbers become fractions first.`
  }
  if (slip === 'cancellingSlip') return `${lead} A top cancels with a bottom, not with another top.`
  if (slip === 'numeratorArithmetic' && step.kind === 'multiplyAcross') {
    return `${lead} Multiply the tops, then multiply the bottoms.`
  }
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
export function buildLearn(problem: AnyProblem, answer: string): LearnContent {
  const steps = workedSteps(problem)
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
