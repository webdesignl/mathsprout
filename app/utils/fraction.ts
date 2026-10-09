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

/** Either a plain fraction or a mixed number; every operation accepts both. */
export type Operand = Fraction | MixedNumber

export type Op = 'add' | 'subtract'

export interface Problem {
  op: Op
  a: Operand
  b: Operand
}

export type AnswerStatus = 'correct' | 'correctNotSimplest' | 'wrong'

export interface AnswerResult {
  status: AnswerStatus
  /** The expected answer written in simplest form, e.g. "3 9/20". */
  simplestForm: string
}

export type StepKind =
  | 'rename'
  | 'regroup'
  | 'addWholes'
  | 'subtractWholes'
  | 'addNumerators'
  | 'subtractNumerators'
  | 'simplify'
  | 'toMixed'
  | 'negative'
  | 'answer'

export interface Step {
  kind: StepKind
  /** One kid-friendly sentence. */
  description: string
  /** The math at this step, e.g. "7 24/20 - 4 15/20". */
  expression: string
}

export type Slip =
  | 'none'
  | 'numeratorArithmetic'
  | 'wholeArithmetic'
  | 'forgotRegroup'
  | 'addedDenominators'
  | 'noCommonDenominator'
  | 'notSimplified'
  | 'unknown'

export interface Diagnosis {
  slip: Slip
  /** Index into the worked steps where the slip happened, or null if unknown. */
  stepIndex: number | null
  /** A question that nudges the student; it never reveals the answer. */
  hint: string
}

// ---------------------------------------------------------------------------
// Core math (integers only)
// ---------------------------------------------------------------------------

/** Greatest common divisor of two integers (always non-negative). */
export function gcd(a: number, b: number): number {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    ;[x, y] = [y, x % y]
  }
  return x
}

/** Least common multiple of two positive integers. */
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return Math.abs((a / gcd(a, b)) * b)
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

function isFraction(x: Operand): x is Fraction {
  return 'numerator' in x
}

/** Turns any operand into a single (unreduced) fraction. */
export function toFraction(x: Operand): Fraction {
  return isFraction(x) ? makeFraction(x.numerator, x.denominator) : toImproper(x)
}

/** True when the value is below zero. 4th grade answers are positive, so the app flags these. */
export function isNegative(x: Operand): boolean {
  return toFraction(x).numerator < 0
}

/** True when the fraction part is proper (num < den) and reduced. A zero fraction part must be 0/1. */
export function isSimplestMixed(m: MixedNumber): boolean {
  if (m.den <= 0 || m.num < 0) return false
  if (m.num === 0) return m.den === 1
  return m.num < m.den && gcd(m.num, m.den) === 1
}

/** a + b, always simplified. */
export function add(a: Operand, b: Operand): Fraction {
  const x = toFraction(a)
  const y = toFraction(b)
  return simplify(
    makeFraction(
      x.numerator * y.denominator + y.numerator * x.denominator,
      x.denominator * y.denominator,
    ),
  )
}

/** a - b, always simplified. The result may be negative; check it with isNegative. */
export function subtract(a: Operand, b: Operand): Fraction {
  const x = toFraction(a)
  const y = toFraction(b)
  return simplify(
    makeFraction(
      x.numerator * y.denominator - y.numerator * x.denominator,
      x.denominator * y.denominator,
    ),
  )
}

/** Value equality by cross-multiplication, so 2/4 equals 1/2. */
export function equals(a: Operand, b: Operand): boolean {
  const x = toFraction(a)
  const y = toFraction(b)
  return x.numerator * y.denominator === y.numerator * x.denominator
}

/** Writes a value in simplest mixed form: "3 9/20", "5", "2/3" or "-1/4". */
export function formatMixed(x: Operand): string {
  const f = simplify(toFraction(x))
  const sign = f.numerator < 0 ? '-' : ''
  const m = toMixed({ numerator: Math.abs(f.numerator), denominator: f.denominator })
  return sign + mixedStr(m.whole, m.num, m.den)
}

function mixedStr(whole: number, num: number, den: number): string {
  if (num === 0) return String(whole)
  if (whole === 0) return `${num}/${den}`
  return `${whole} ${num}/${den}`
}

/** Like mixedStr but always shows the fraction part (e.g. "9 0/6"), for renamed expressions. */
function rawStr(whole: number, num: number, den: number): string {
  return whole === 0 ? `${num}/${den}` : `${whole} ${num}/${den}`
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

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

/** Parses the same inputs as parseMixed into a single improper fraction. Returns null if invalid. */
export function parse(input: string): Fraction | null {
  const m = parseMixed(input)
  if (!m) return null
  try {
    return toImproper(m)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Worked steps (Singapore Math style)
// ---------------------------------------------------------------------------

interface Solution {
  steps: Step[]
  a: MixedNumber
  b: MixedNumber
  lcd: number
  /** Numerators after renaming to the least common denominator. */
  aRenamed: number
  bRenamed: number
  regrouped: boolean
  negative: boolean
  /** Whole and numerator just before simplifying (fraction part is over `lcd`). Null if negative. */
  combined: { whole: number; num: number } | null
  result: Fraction
}

/** Splits a non-negative operand into whole + proper fraction without reducing the denominator. */
function normalize(x: Operand): MixedNumber {
  const f = toFraction(x)
  if (f.numerator < 0) throw new RangeError('Steps only support non-negative operands')
  const whole = Math.floor(f.numerator / f.denominator)
  return { whole, num: f.numerator - whole * f.denominator, den: f.denominator }
}

function solve(problem: Problem): Solution {
  const { op } = problem
  const a = normalize(problem.a)
  const b = normalize(problem.b)
  const sym = op === 'add' ? '+' : '-'
  const lcd = lcm(a.den, b.den)
  const aRenamed = a.num * (lcd / a.den)
  const bRenamed = b.num * (lcd / b.den)
  const result = (op === 'add' ? add : subtract)(problem.a, problem.b)
  const steps: Step[] = []

  if (a.den !== b.den) {
    steps.push({
      kind: 'rename',
      description: `Rename both fractions so they share the denominator ${lcd}.`,
      expression: `${rawStr(a.whole, aRenamed, lcd)} ${sym} ${rawStr(b.whole, bRenamed, lcd)}`,
    })
  }

  const base = { a, b, lcd, aRenamed, bRenamed, result }

  if (result.numerator < 0) {
    const ia = a.whole * lcd + aRenamed
    const ib = b.whole * lcd + bRenamed
    const diff = ia - ib
    steps.push({
      kind: 'subtractNumerators',
      description: 'The first number is smaller, so taking away more than we have goes below zero.',
      expression: `${ia}/${lcd} - ${ib}/${lcd} = ${diff}/${lcd}`,
    })
    if (gcd(diff, lcd) > 1) {
      steps.push({
        kind: 'simplify',
        description: `Make the fraction smaller by dividing the top and bottom by ${gcd(diff, lcd)}.`,
        expression: `${diff}/${lcd} = ${result.numerator}/${result.denominator}`,
      })
    }
    steps.push({
      kind: 'negative',
      description: 'The answer is below zero, so check which number should come first.',
      expression: formatMixed(result),
    })
    return { ...base, steps, regrouped: false, negative: true, combined: null }
  }

  let aWhole = a.whole
  let aNum = aRenamed
  const regrouped = op === 'subtract' && aRenamed < bRenamed
  if (regrouped) {
    aWhole -= 1
    aNum += lcd
    steps.push({
      kind: 'regroup',
      description: `${aRenamed}/${lcd} is too small to take away ${bRenamed}/${lcd}, so borrow 1 whole and turn it into ${lcd}/${lcd}.`,
      expression: `${rawStr(aWhole, aNum, lcd)} - ${rawStr(b.whole, bRenamed, lcd)}`,
    })
  }

  let whole = op === 'add' ? aWhole + b.whole : aWhole - b.whole
  const num = op === 'add' ? aNum + bRenamed : aNum - bRenamed

  if (a.whole > 0 || b.whole > 0) {
    steps.push({
      kind: op === 'add' ? 'addWholes' : 'subtractWholes',
      description: `${op === 'add' ? 'Add' : 'Subtract'} the whole numbers.`,
      expression: `${aWhole} ${sym} ${b.whole} = ${whole}`,
    })
  }
  if (aRenamed > 0 || bRenamed > 0) {
    steps.push({
      kind: op === 'add' ? 'addNumerators' : 'subtractNumerators',
      description: `${op === 'add' ? 'Add' : 'Subtract'} the numerators and keep the denominator ${lcd}.`,
      expression: `${aNum}/${lcd} ${sym} ${bRenamed}/${lcd} = ${num}/${lcd}`,
    })
  }

  const combined = { whole, num }
  let fracNum = num
  let fracDen = lcd
  const g = gcd(num, lcd)
  if (num > 0 && g > 1) {
    fracNum = num / g
    fracDen = lcd / g
    steps.push({
      kind: 'simplify',
      description: `Make the fraction smaller by dividing the top and bottom by ${g}.`,
      expression: `${num}/${lcd} = ${fracNum}/${fracDen}`,
    })
  }
  if (num > 0 && fracNum >= fracDen) {
    const carry = Math.floor(fracNum / fracDen)
    const rem = fracNum - carry * fracDen
    steps.push({
      kind: 'toMixed',
      description: 'The fraction is 1 whole or more, so move the wholes over to the whole number.',
      expression: `${rawStr(whole, fracNum, fracDen)} = ${mixedStr(whole + carry, rem, fracDen)}`,
    })
    whole += carry
  }

  steps.push({
    kind: 'answer',
    description: 'Put the whole number and the fraction together for the answer.',
    expression: formatMixed(result),
  })

  return { ...base, steps, regrouped, negative: false, combined }
}

/** Worked steps for a + b. Operands must be non-negative. */
export function addSteps(a: Operand, b: Operand): Step[] {
  return solve({ op: 'add', a, b }).steps
}

/** Worked steps for a - b, regrouping 1 whole when the fraction part is too small. */
export function subtractSteps(a: Operand, b: Operand): Step[] {
  return solve({ op: 'subtract', a, b }).steps
}

// ---------------------------------------------------------------------------
// Answer checking and slip diagnosis
// ---------------------------------------------------------------------------

/**
 * Grades a student's typed answer. Code decides correctness, never AI.
 * Simplest form is checked on the raw parsed input, before any simplifying.
 * Invalid input and zero denominators return 'wrong' without throwing.
 */
export function checkAnswer(expected: Operand, studentInput: string): AnswerResult {
  const simplestForm = formatMixed(expected)
  const parsed = parseMixed(studentInput)
  if (!parsed || !equals(expected, toImproper(parsed))) return { status: 'wrong', simplestForm }
  return { status: isSimplestMixed(parsed) ? 'correct' : 'correctNotSimplest', simplestForm }
}

const HINTS: Record<Slip, string> = {
  none: '',
  addedDenominators:
    'Can you add the bottom numbers when you add fractions? What size pieces should both fractions be cut into first?',
  noCommonDenominator:
    'Are the pieces the same size in both fractions? What could you do to make the denominators match before you combine them?',
  forgotRegroup:
    'Look at the numerators once the denominators match. Do you have enough pieces to take away? Where could you get more?',
  numeratorArithmetic:
    'Your whole number and denominator look good. Can you redo the numerator step slowly and check it?',
  wholeArithmetic:
    'Your fraction part looks good. Can you check the whole numbers again, and did any whole move to or from the fraction?',
  notSimplified:
    'You have the right amount! Is the fraction part still 1 whole or more, or can its top and bottom be divided by the same number?',
  unknown:
    'Let’s go one step at a time. What do you need to check about the denominators before you start?',
}

function stepIndex(steps: Step[], ...kinds: StepKind[]): number | null {
  const i = steps.findIndex((s) => kinds.includes(s.kind))
  return i === -1 ? null : i
}

function candidate(whole: number, num: number, den: number): Fraction | null {
  if (whole < 0 || num < 0 || den <= 0) return null
  try {
    return makeFraction(whole * den + num, den)
  } catch {
    return null
  }
}

function matches(value: Fraction, cand: Fraction | null): boolean {
  return cand !== null && equals(value, cand)
}

/**
 * Looks at a student's answer and names the most likely slip by comparing it to the worked steps.
 * Returns the step where the slip happened and a hint question that never gives the answer.
 */
export function diagnose(problem: Problem, studentInput: string): Diagnosis {
  const diagnosis = (slip: Slip, idx: number | null): Diagnosis => ({
    slip,
    stepIndex: idx,
    hint: HINTS[slip],
  })

  const p = parseMixed(studentInput)
  if (!p) return diagnosis('unknown', null)

  const s = solve(problem)
  const value = toImproper(p)
  const lastIndex = s.steps.length - 1

  if (equals(s.result, value)) {
    if (isSimplestMixed(p)) return diagnosis('none', null)
    return diagnosis(
      'notSimplified',
      stepIndex(s.steps, 'simplify', 'toMixed') ?? lastIndex,
    )
  }
  if (s.negative || !s.combined) return diagnosis('unknown', null)

  const { a, b, lcd, aRenamed, bRenamed } = s
  const isAdd = problem.op === 'add'
  const sameDen = a.den === b.den

  if (isAdd && !sameDen) {
    const summed = candidate(a.whole + b.whole, a.num + b.num, a.den + b.den)
    const improper = toFraction(problem.a)
    const improperB = toFraction(problem.b)
    const wholeFraction = candidate(
      0,
      improper.numerator + improperB.numerator,
      improper.denominator + improperB.denominator,
    )
    if (matches(value, summed) || matches(value, wholeFraction)) {
      return diagnosis('addedDenominators', stepIndex(s.steps, 'rename'))
    }
  }

  if (s.regrouped) {
    const noBorrow = candidate(a.whole - b.whole, Math.abs(aRenamed - bRenamed), lcd)
    if (matches(value, noBorrow)) return diagnosis('forgotRegroup', stepIndex(s.steps, 'regroup'))
  }

  if (!sameDen) {
    const w = isAdd ? a.whole + b.whole : a.whole - b.whole
    const n = isAdd ? a.num + b.num : a.num - b.num
    if (matches(value, candidate(w, n, a.den)) || matches(value, candidate(w, n, b.den))) {
      return diagnosis('noCommonDenominator', stepIndex(s.steps, 'rename'))
    }
  }

  const expected = toMixed(s.result)
  const sameWholeAndDen =
    (p.whole === expected.whole && p.den === expected.den && p.num !== expected.num) ||
    (p.whole === s.combined.whole && p.den === lcd && p.num !== s.combined.num)
  if (sameWholeAndDen) {
    return diagnosis('numeratorArithmetic', stepIndex(s.steps, 'addNumerators', 'subtractNumerators'))
  }

  const sameFraction = equals(
    makeFraction(p.num, p.den),
    makeFraction(expected.num, expected.den),
  )
  if (sameFraction && p.whole !== expected.whole) {
    return diagnosis(
      'wholeArithmetic',
      stepIndex(s.steps, 'addWholes', 'subtractWholes') ?? lastIndex,
    )
  }

  return diagnosis('unknown', null)
}

/**
 * Checks a result by working backwards: for subtraction, result + b should equal a;
 * for addition, result - b should equal a. Returns the check as an expression to show the student.
 */
export function verifyByInverse(
  op: Op,
  a: Operand,
  b: Operand,
  result: Operand,
): { holds: boolean; expression: string } {
  const back = op === 'subtract' ? add(result, b) : subtract(result, b)
  const sym = op === 'subtract' ? '+' : '-'
  return {
    holds: equals(back, a),
    expression: `${formatMixed(result)} ${sym} ${formatMixed(b)} = ${formatMixed(a)}`,
  }
}
