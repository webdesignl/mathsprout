/** A fraction with an integer numerator and a positive integer denominator. */
export interface Fraction {
  numerator: number
  denominator: number
}

/** A mixed number: whole + num/den. */
export interface MixedNumber {
  whole: number
  num: number
  den: number
}

export type AnswerResult = 'correct' | 'correctNotSimplest' | 'wrong'

function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    ;[x, y] = [y, x % y]
  }
  return x
}

/** Builds a Fraction, throwing if the parts are not safe integers or the denominator is not positive. */
export function makeFraction(numerator: number, denominator: number): Fraction {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    throw new RangeError('Numerator and denominator must be integers')
  }
  if (denominator <= 0) {
    throw new RangeError('Denominator must be positive')
  }
  return { numerator, denominator }
}

/** Reduces a fraction to lowest terms. */
export function simplify(f: Fraction): Fraction {
  const { numerator, denominator } = makeFraction(f.numerator, f.denominator)
  const d = gcd(numerator, denominator)
  return { numerator: numerator / d, denominator: denominator / d }
}

/** Converts a non-negative fraction to a mixed number in simplest form. */
export function toMixed(f: Fraction): MixedNumber {
  const s = simplify(f)
  if (s.numerator < 0) {
    throw new RangeError('toMixed only supports non-negative fractions')
  }
  const whole = Math.floor(s.numerator / s.denominator)
  return { whole, num: s.numerator - whole * s.denominator, den: s.denominator }
}

/** Converts a mixed number to an improper fraction (not reduced). */
export function toImproper(m: MixedNumber): Fraction {
  return makeFraction(m.whole * m.den + m.num, m.den)
}

/** True when the fraction part is proper (num < den) and reduced. A zero fraction part must be 0/1. */
export function isSimplestMixed(m: MixedNumber): boolean {
  if (m.den <= 0 || m.num < 0) return false
  if (m.num === 0) return m.den === 1
  return m.num < m.den && gcd(m.num, m.den) === 1
}

export function add(a: Fraction, b: Fraction): Fraction {
  return simplify(
    makeFraction(
      a.numerator * b.denominator + b.numerator * a.denominator,
      a.denominator * b.denominator,
    ),
  )
}

export function subtract(a: Fraction, b: Fraction): Fraction {
  return simplify(
    makeFraction(
      a.numerator * b.denominator - b.numerator * a.denominator,
      a.denominator * b.denominator,
    ),
  )
}

/** Value equality by cross-multiplication, so 2/4 equals 1/2. */
export function equals(a: Fraction, b: Fraction): boolean {
  return a.numerator * b.denominator === b.numerator * a.denominator
}

const MIXED_RE = /^(\d+)\s+(\d+)\/(\d+)$/
const FRACTION_RE = /^(\d+)\/(\d+)$/
const WHOLE_RE = /^(\d+)$/

/** Parses "3 6/5", "21/5" or "4" into a raw (unsimplified) mixed number. Returns null if invalid. */
export function parseMixed(input: string): MixedNumber | null {
  const text = input.trim()
  let parts: [number, number, number] | null = null

  let m = MIXED_RE.exec(text)
  if (m) parts = [Number(m[1]), Number(m[2]), Number(m[3])]
  else if ((m = FRACTION_RE.exec(text))) parts = [0, Number(m[1]), Number(m[2])]
  else if ((m = WHOLE_RE.exec(text))) parts = [Number(m[1]), 0, 1]

  if (!parts || !parts.every(Number.isSafeInteger)) return null
  const [whole, num, den] = parts
  if (den === 0) return null
  return { whole, num, den }
}

/**
 * Grades a student's typed answer. Code decides correctness, never AI.
 * Simplest form is checked on the raw parsed input, before any simplifying.
 */
export function checkAnswer(expected: Fraction, studentInput: string): AnswerResult {
  const parsed = parseMixed(studentInput)
  if (!parsed) return 'wrong'
  if (!equals(expected, toImproper(parsed))) return 'wrong'
  return isSimplestMixed(parsed) ? 'correct' : 'correctNotSimplest'
}
