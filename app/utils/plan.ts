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
  /**
   * Short names for the bar model, written by the AI and used only as words on the picture:
   * what the first number is, what the second number is, and what this step's answer is
   * (for example "wear glasses", "male", "male who do not wear glasses"). No digits, never an answer.
   */
  aName?: string
  bName?: string
  name?: string
}

/**
 * A problem that asks for the unknown whole ("he had $250 left; how much did he win?"). Takes happen in groups:
 * the first group takes fractions of the whole, the next of what was left. Code turns this into plan steps and a
 * unit bar (see unitBar.ts); the AI only reads the shape and the words.
 */
export interface UnitSpec {
  groups: Array<{ takes: Array<{ share: string; name?: string }> }>
  left: { amount: string; unit?: string; name?: string }
}

/**
 * "The same amount is used each day": a fraction is left after some days, and an amount is left after some more.
 * Code turns it into plan steps and a day strip (see rateBar.ts).
 */
export interface RateSpec {
  first: { days: string; left: string }
  second: { days: string; amountLeft: string }
  unit?: string
}

/**
 * Spacing: marks at equal gaps along a line. The words (balloons, trees, poles, lamps, stairs) do not matter; the
 * core is that marks and gaps are different counts: marks = gaps + 1, and distance = gaps x one gap. Positions are
 * counted from 1. Two kinds of question:
 * - find the last mark: `far` is where counting starts and the distance from there to the last mark, and the length
 *   of one gap is given (`gap`) or worked out from two known marks (`near`).
 * - find the distance: `count` marks in all and the length of one `gap`.
 * - find how many gaps fit: `gap` and `far.distance` with `ask: 'gaps'` (the answer is whole when they fit exactly).
 * - find the gap with margins and object widths taken out first: `count`, `total` and `edge` and/or `size`.
 * - find the gap: `count` marks in all and the `total` distance from the first mark to the last.
 * Code turns it into steps and a number line (see spacing.ts); the AI only reads the shape and a word for the mark.
 */
export interface SpacingSpec {
  /** What a mark is called ("balloon"); optional, and "mark" is used when it is missing. */
  thing?: string
  plural?: string
  unit?: string
  gap?: string
  near?: { from: string; to: string; distance: string }
  far?: { from: string; distance: string }
  /** How many marks there are in all, when the question is how far it is from the first to the last. */
  count?: string
  /** The distance from the first mark to the last, when the question is how long one gap is (with `count`). */
  total?: string
  /** "How many gaps fit?": with `gap` and `far.distance`, the question stops at the number of gaps. */
  ask?: 'gaps'
  /** A margin at each end of the row, and the width of each object, for "how wide is each gap between the objects?" (with `count` and `total`). */
  edge?: string
  size?: string
}

export interface Plan {
  steps: PlanStep[]
  /** Short facts from the problem ("4th to 7th balloon: 1 3/4 m"), shown as "What is given". Never an answer. */
  given?: string[]
  /** Set when the plan was made from a things-in-a-row problem; it adds the number line. */
  spacing?: SpacingSpec
  /** What the whole is called in the bar model, for example "the family". */
  whole?: string
  /** Set when the plan was made from an unknown-whole problem; it adds the unit bar. */
  unit?: UnitSpec
  /** Set when the plan was made from a same-amount-each-day problem; it adds the day strip. */
  rate?: RateSpec
}

export const MIN_PLAN_STEPS = 2
/** The AI may write up to 5 steps; plans built by code from a known shape (unit bar, same amount each day) may use 6. */
export const MAX_PLAN_STEPS = 6
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
  // A spacing question may stop after one step ("how many gaps fit?").
  if (plan.steps.length < (plan.spacing ? 1 : MIN_PLAN_STEPS) || plan.steps.length > MAX_PLAN_STEPS) return { ok: false, reason: 'steps' }

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
  // The unit bar's shares are not in the steps, so a new set of numbers would not match it.
  if (plan.unit || plan.rate || plan.spacing) return null
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
    const next: Plan = { ...plan, steps: plan.steps.map((s) => ({ ...s, a: swap(s.a), b: swap(s.b) })) }
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
