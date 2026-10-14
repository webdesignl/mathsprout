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

const SIMILAR_TRIES = 60

/** A proper fraction such as 3/4: the kind of number that can be swapped for another one. */
function isProperFraction(text: string): boolean {
  const m = parseMixed(text)
  return m !== null && m.whole === 0 && m.num > 0 && m.num < m.den
}

export interface SimilarPlan {
  plan: Plan
  /** Each fraction that was swapped, as [old, new]. The same old fraction always becomes the same new one. */
  swaps: Array<[string, string]>
}

/**
 * A similar problem with new numbers: the same steps in the same order, with each fraction swapped for another
 * small one (halves to eighths). A fraction that appears in two steps is swapped the same way in both, because
 * it is the same quantity in the story. Whole numbers and answers carried between steps stay. Only a plan the
 * engine accepts is returned, so it always works out. Null if none is found.
 */
export function similarPlan(plan: Plan, random: () => number = Math.random): SimilarPlan | null {
  const pick = (n: number) => Math.floor(random() * n)
  const fraction = () => {
    const den = 2 + pick(7)
    return `${1 + pick(den - 1)}/${den}`
  }
  const originals = [...new Set(plan.steps.flatMap((s) => [s.a, s.b]).filter(isProperFraction).map((t) => t.trim()))]
  if (originals.length === 0) return null

  for (let i = 0; i < SIMILAR_TRIES; i++) {
    const swaps: Array<[string, string]> = []
    for (const old of originals) {
      let next = fraction()
      // Different fractions in the story stay different, and every fraction changes.
      for (let t = 0; t < 10 && (next === old || swaps.some(([, n]) => n === next)); t++) next = fraction()
      swaps.push([old, next])
    }
    const lookup = new Map(swaps)
    const swap = (text: string) => lookup.get(text.trim()) ?? text
    const next: Plan = { steps: plan.steps.map((s) => ({ ...s, a: swap(s.a), b: swap(s.b) })) }
    const changed = swaps.every(([old, now]) => old !== now) && new Set(swaps.map(([, n]) => n)).size === swaps.length
    if (changed && resolvePlan(next).ok) return { plan: next, swaps }
  }
  return null
}

/**
 * The story with its fractions swapped for the new ones, all at once so a new fraction is never swapped again.
 * Null when a swapped fraction is not written as "a/b" in the story (for example "one fifth"), because then the
 * words would not match the new numbers.
 */
export function similarStory(story: string, swaps: Array<[string, string]>): string | null {
  const lookup = new Map(swaps.map(([old, now]) => [old.replace(/\s+/g, ''), now]))
  const found = new Set<string>()
  const text = story.replace(/(?<![\d/])(\d+)\s*\/\s*(\d+)(?![\d/])/g, (match, top: string, bottom: string) => {
    const key = `${top}/${bottom}`
    const now = lookup.get(key)
    if (now === undefined) return match
    found.add(key)
    return now
  })
  return found.size === lookup.size ? text : null
}
