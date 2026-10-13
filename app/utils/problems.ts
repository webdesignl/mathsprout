import {
  opSymbol,
  subtractSteps,
  type AnyProblem,
  type MixedNumber,
  type Operand,
  type Problem,
} from './fraction'

/**
 * 'mixed' is a mix of adding and subtracting (kept for older code). 'all' is a mix of all four operations.
 */
export type ProblemOp = 'add' | 'subtract' | 'multiply' | 'divide' | 'mixed' | 'all'

/** What kinds of numbers a multiplication or division uses. */
export type MultiplyLevel = 'fractionTimesWhole' | 'fractionTimesFraction' | 'mixedTimesWhole' | 'mixedTimesMixed'
export type DivideLevel = 'wholeByFraction' | 'fractionByWhole' | 'fractionByFraction' | 'mixedByMixed'
export type MulLevel = MultiplyLevel | DivideLevel

export const MULTIPLY_LEVELS: MultiplyLevel[] = [
  'fractionTimesWhole',
  'fractionTimesFraction',
  'mixedTimesWhole',
  'mixedTimesMixed',
]
export const DIVIDE_LEVELS: DivideLevel[] = ['wholeByFraction', 'fractionByWhole', 'fractionByFraction', 'mixedByMixed']

export interface GenerateOptions {
  op: ProblemOp
  /** Largest denominator to use. Denominators run from 2 up to this (at least 3 for adding and subtracting, so they can differ). */
  maxDenominator: number
  /** Subtraction only: the first fraction part must be smaller than the second after renaming. */
  needsRegroup?: boolean
  /** Multiplying and dividing only: which kinds of numbers to use. Random when left out. */
  level?: MulLevel
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

// --- Multiplication and division ---

/** A whole number from 2 to 9 (never 0, so nothing divides by zero, and never 1, so it is never trivial). */
function wholeNumber(rng: Random): MixedNumber {
  return { whole: randInt(rng, 2, MAX_WHOLE), num: 0, den: 1 }
}

/** A proper fraction with a numerator of at least 1. */
function fractionNumber(rng: Random, max: number): MixedNumber {
  const den = randInt(rng, 2, max)
  return { whole: 0, num: randInt(rng, 1, den - 1), den }
}

/** A mixed number with a whole part of 1 to 9 and a proper fraction part. */
function mixedNumber(rng: Random, max: number): MixedNumber {
  const part = fractionNumber(rng, max)
  return { whole: randInt(rng, 1, MAX_WHOLE), num: part.num, den: part.den }
}

function pick<T>(rng: Random, list: readonly T[]): T {
  return list[Math.min(Math.floor(rng() * list.length), list.length - 1)]!
}

function generateMultiply(rng: Random, max: number, level?: MulLevel): AnyProblem {
  const chosen = MULTIPLY_LEVELS.find((l) => l === level) ?? pick(rng, MULTIPLY_LEVELS)
  switch (chosen) {
    case 'fractionTimesWhole':
      return { op: 'multiply', a: fractionNumber(rng, max), b: wholeNumber(rng) }
    case 'fractionTimesFraction':
      return { op: 'multiply', a: fractionNumber(rng, max), b: fractionNumber(rng, max) }
    case 'mixedTimesWhole':
      return { op: 'multiply', a: mixedNumber(rng, max), b: wholeNumber(rng) }
    default:
      return { op: 'multiply', a: mixedNumber(rng, max), b: mixedNumber(rng, max) }
  }
}

function generateDivide(rng: Random, max: number, level?: MulLevel): AnyProblem {
  const chosen = DIVIDE_LEVELS.find((l) => l === level) ?? pick(rng, DIVIDE_LEVELS)
  switch (chosen) {
    case 'wholeByFraction':
      return { op: 'divide', a: wholeNumber(rng), b: fractionNumber(rng, max) }
    case 'fractionByWhole':
      return { op: 'divide', a: fractionNumber(rng, max), b: wholeNumber(rng) }
    case 'fractionByFraction':
      return { op: 'divide', a: fractionNumber(rng, max), b: fractionNumber(rng, max) }
    default:
      return { op: 'divide', a: mixedNumber(rng, max), b: mixedNumber(rng, max) }
  }
}

type NumberKind = 'whole' | 'fraction' | 'mixed'

function kindOf(x: Operand): NumberKind {
  if ('numerator' in x) {
    if (x.denominator === 1) return 'whole'
    return x.numerator < x.denominator ? 'fraction' : 'mixed'
  }
  if (x.num === 0) return 'whole'
  return x.whole === 0 ? 'fraction' : 'mixed'
}

/** Which level a multiplication or division problem is at, or null if it fits none of the eight (or is add/subtract). */
export function levelOf(problem: AnyProblem): MulLevel | null {
  const a = kindOf(problem.a)
  const b = kindOf(problem.b)
  if (problem.op === 'multiply') {
    if (a === 'fraction' && b === 'whole') return 'fractionTimesWhole'
    if (a === 'fraction' && b === 'fraction') return 'fractionTimesFraction'
    if (a === 'mixed' && b === 'whole') return 'mixedTimesWhole'
    if (a === 'mixed' && b === 'mixed') return 'mixedTimesMixed'
  }
  if (problem.op === 'divide') {
    if (a === 'whole' && b === 'fraction') return 'wholeByFraction'
    if (a === 'fraction' && b === 'whole') return 'fractionByWhole'
    if (a === 'fraction' && b === 'fraction') return 'fractionByFraction'
    if (a === 'mixed' && b === 'mixed') return 'mixedByMixed'
  }
  return null
}

/**
 * Creates one original practice problem.
 * Adding and subtracting use mixed numbers with unlike denominators and wholes 0 to 9; subtraction answers
 * are always positive. Multiplying and dividing use the eight levels (denominators 2 to the maximum), and
 * nothing is ever divided by zero. `needsRegroup` only affects subtraction.
 * 'mixed' mixes adding and subtracting; 'all' mixes all four operations.
 */
export function generateProblem(options: GenerateOptions, rng: Random = Math.random): AnyProblem {
  const choice: ProblemOp = options.op
  const op =
    choice === 'mixed'
      ? rng() < 0.5
        ? 'add'
        : 'subtract'
      : choice === 'all'
        ? pick(rng, ['add', 'subtract', 'multiply', 'divide'] as const)
        : choice

  if (op === 'multiply' || op === 'divide') {
    if (options.maxDenominator < 2) throw new RangeError('maxDenominator must be at least 2')
    return op === 'multiply'
      ? generateMultiply(rng, options.maxDenominator, options.level)
      : generateDivide(rng, options.maxDenominator, options.level)
  }
  if (options.maxDenominator < 3) {
    throw new RangeError('maxDenominator must be at least 3 so denominators can differ')
  }
  return op === 'add'
    ? generateAdd(rng, options.maxDenominator)
    : generateSubtract(rng, options.maxDenominator, options.needsRegroup === true)
}

function operandText(m: MixedNumber): string {
  if (m.num === 0) return String(m.whole)
  return m.whole === 0 ? `${m.num}/${m.den}` : `${m.whole} ${m.num}/${m.den}`
}

/** The problem as plain text for summaries, without simplifying anything: "8 1/5 − 4 3/4". */
export function describeProblem(problem: AnyProblem): string {
  const [a, b] = [problem.a, problem.b].map((o) =>
    'whole' in o ? operandText(o) : `${o.numerator}/${o.denominator}`,
  )
  return `${a} ${opSymbol(problem.op)} ${b}`
}

/** True when subtracting this problem needs a regroup (borrow). Uses the engine's worked steps. */
export function problemNeedsRegroup(problem: AnyProblem): boolean {
  return problem.op === 'subtract' && subtractSteps(problem.a, problem.b).some((s) => s.kind === 'regroup')
}

/**
 * A new problem like this one: same operation, and the same regroup setting (a subtraction that needed
 * borrowing gets another that needs borrowing) or the same level (a fraction ÷ whole gets another fraction ÷ whole).
 * Tries a few times to avoid handing back the exact same problem.
 */
export function generateSimilarProblem(
  problem: AnyProblem,
  maxDenominator: number,
  rng: Random = Math.random,
): AnyProblem {
  const options: GenerateOptions = {
    op: problem.op,
    maxDenominator,
    needsRegroup: problemNeedsRegroup(problem),
    level: levelOf(problem) ?? undefined,
  }
  let next = generateProblem(options, rng)
  for (let i = 0; i < 5 && describeProblem(next) === describeProblem(problem); i++) {
    next = generateProblem(options, rng)
  }
  return next
}
