import {
  isNegative,
  parseMixed,
  problemAnswer,
  toMixed,
  type AnyOp,
  type AnyProblem,
  type MixedNumber,
} from './fraction'

/**
 * A multi-step problem is a plan: a short list of steps, each one operation on two numbers.
 * A number is written like "1/5" or "2 3/4", or "r1" for the answer to step 1.
 * The AI writes the plan; this file only uses the fraction engine, so every step is checked by code.
 */
export interface PlanStep {
  op: AnyOp
  a: string
  b: string
  /** A question in plain words for this step. It never names the operation or a result. */
  label: string
}

export interface Plan {
  steps: PlanStep[]
}

export const MIN_PLAN_STEPS = 2
export const MAX_PLAN_STEPS = 5
/** A step result bigger than this is not a school problem, and could overflow the engine. */
const MAX_PART = 99_999

export type PlanFailure = 'steps' | 'operand' | 'reference' | 'negative' | 'zeroDivisor' | 'unused' | 'tooBig'

export type PlanCheck =
  | { ok: true; problems: AnyProblem[]; results: MixedNumber[] }
  | { ok: false; reason: PlanFailure }

const REFERENCE = /^r([1-9])$/i

/** Reads one operand: a number, or the answer to an earlier step. Null when it is neither. */
function operandOf(text: string, results: MixedNumber[]): MixedNumber | 'reference' | null {
  const ref = REFERENCE.exec(text.trim())
  if (ref) return results[Number(ref[1]) - 1] ?? 'reference'
  return parseMixed(text)
}

/** The steps of the plan as real problems with real numbers, and the engine's answer to each one. */
export function resolvePlan(plan: Plan): PlanCheck {
  if (plan.steps.length < MIN_PLAN_STEPS || plan.steps.length > MAX_PLAN_STEPS) return { ok: false, reason: 'steps' }

  const problems: AnyProblem[] = []
  const results: MixedNumber[] = []
  const used = new Set<number>()

  for (const step of plan.steps) {
    const operands = [step.a, step.b].map((text) => {
      const ref = REFERENCE.exec(text.trim())
      if (ref) used.add(Number(ref[1]))
      return operandOf(text, results)
    })
    const [a, b] = operands
    if (a === 'reference' || b === 'reference') return { ok: false, reason: 'reference' }
    if (!a || !b) return { ok: false, reason: 'operand' }

    const problem = { op: step.op, a, b } as AnyProblem
    const answer = problemAnswer(problem)
    if (!answer) return { ok: false, reason: 'zeroDivisor' }
    if (isNegative(answer)) return { ok: false, reason: 'negative' }
    if (Math.abs(answer.numerator) > MAX_PART || answer.denominator > MAX_PART) return { ok: false, reason: 'tooBig' }

    problems.push(problem)
    results.push(toMixed(answer))
  }

  // Every step but the last must feed a later step, or the plan has a step that goes nowhere.
  for (let i = 1; i < plan.steps.length; i++) {
    if (!used.has(i)) return { ok: false, reason: 'unused' }
  }
  return { ok: true, problems, results }
}
