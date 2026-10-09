import type { MixedNumber, Problem } from './fraction'

export type ProblemOp = 'add' | 'subtract' | 'mixed'

export interface GenerateOptions {
  op: ProblemOp
  /** Largest denominator to use. Denominators run from 2 up to this (at least 3, so they can differ). */
  maxDenominator: number
  /** Subtraction only: the first fraction part must be smaller than the second after renaming. */
  needsRegroup?: boolean
}

/** A function returning a number in [0, 1), like Math.random. Inject a fake one in tests. */
export type Random = () => number

const MAX_WHOLE = 9

function randInt(rng: Random, min: number, max: number): number {
  return min + Math.min(Math.floor(rng() * (max - min + 1)), max - min)
}

/** Picks two different denominators in [2, max] without any retry loops. */
function pickDenominators(rng: Random, max: number): [number, number] {
  const first = randInt(rng, 2, max)
  const choices: number[] = []
  for (let d = 2; d <= max; d++) {
    if (d !== first) choices.push(d)
  }
  return [first, choices[randInt(rng, 0, choices.length - 1)]!]
}

interface Part {
  num: number
  den: number
}

/** Compares two proper fractions by cross-multiplication: negative if x < y. */
function compareParts(x: Part, y: Part): number {
  return x.num * y.den - y.num * x.den
}

/**
 * Picks two proper fraction parts with unlike denominators.
 * When `ascending` is true the first one is guaranteed smaller than the second.
 */
function pickParts(rng: Random, max: number, ascending: boolean): [Part, Part] {
  const [ad, bd] = pickDenominators(rng, max)
  let a: Part = { num: randInt(rng, 1, ad - 1), den: ad }
  let b: Part = { num: randInt(rng, 1, bd - 1), den: bd }
  if (!ascending) return [a, b]

  if (compareParts(a, b) > 0) [a, b] = [b, a]
  if (compareParts(a, b) === 0) {
    // Same value (e.g. 1/2 and 2/4): bump the second one's numerator up, or step the first down.
    if (b.num < b.den - 1) b = { ...b, num: b.num + 1 }
    else a = { ...a, num: a.num - 1 }
  }
  return [a, b]
}

function mixed(whole: number, part: Part): MixedNumber {
  return { whole, num: part.num, den: part.den }
}

function generateAdd(rng: Random, max: number): Problem {
  const [a, b] = pickParts(rng, max, false)
  return {
    op: 'add',
    a: mixed(randInt(rng, 0, MAX_WHOLE), a),
    b: mixed(randInt(rng, 0, MAX_WHOLE), b),
  }
}

function generateSubtract(rng: Random, max: number, needsRegroup: boolean): Problem {
  if (needsRegroup) {
    // First fraction smaller than the second, so the first number needs a bigger whole.
    const [a, b] = pickParts(rng, max, true)
    const bWhole = randInt(rng, 0, MAX_WHOLE - 1)
    const aWhole = randInt(rng, bWhole + 1, MAX_WHOLE)
    return { op: 'subtract', a: mixed(aWhole, a), b: mixed(bWhole, b) }
  }

  const [pa, pb] = pickParts(rng, max, false)
  let a = mixed(randInt(rng, 0, MAX_WHOLE), pa)
  let b = mixed(randInt(rng, 0, MAX_WHOLE), pb)
  if (valueCompare(a, b) < 0) [a, b] = [b, a]
  if (valueCompare(a, b) === 0) {
    // Equal values would give 0; nudge a whole so the answer is positive.
    if (a.whole < MAX_WHOLE) a = { ...a, whole: a.whole + 1 }
    else b = { ...b, whole: b.whole - 1 }
  }
  return { op: 'subtract', a, b }
}

function toFractionLike(m: MixedNumber) {
  return { numerator: m.whole * m.den + m.num, denominator: m.den }
}

/** Negative if a < b, zero if equal, positive if a > b (integer cross-multiplication). */
function valueCompare(a: MixedNumber, b: MixedNumber): number {
  const x = toFractionLike(a)
  const y = toFractionLike(b)
  return x.numerator * y.denominator - y.numerator * x.denominator
}

/**
 * Creates one original practice problem.
 * Mixed numbers use unlike denominators and wholes 0 to 9; subtraction answers are always positive.
 * `needsRegroup` only affects subtraction; with op 'mixed' it applies to the subtraction problems.
 */
export function generateProblem(options: GenerateOptions, rng: Random = Math.random): Problem {
  if (options.maxDenominator < 3) {
    throw new RangeError('maxDenominator must be at least 3 so denominators can differ')
  }
  const op =
    options.op === 'mixed' ? (rng() < 0.5 ? 'add' : 'subtract') : options.op
  return op === 'add'
    ? generateAdd(rng, options.maxDenominator)
    : generateSubtract(rng, options.maxDenominator, options.needsRegroup === true)
}

function operandText(m: MixedNumber): string {
  if (m.num === 0) return String(m.whole)
  return m.whole === 0 ? `${m.num}/${m.den}` : `${m.whole} ${m.num}/${m.den}`
}

/** The problem as plain text for summaries, without simplifying anything: "8 1/5 − 4 3/4". */
export function describeProblem(problem: Problem): string {
  const symbol = problem.op === 'add' ? '+' : '−'
  const [a, b] = [problem.a, problem.b].map((o) =>
    'whole' in o ? operandText(o) : `${o.numerator}/${o.denominator}`,
  )
  return `${a} ${symbol} ${b}`
}
