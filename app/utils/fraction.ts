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

/** Multiplication and division are separate from Op, so code that only handles add and subtract stays safe. */
export type MulOp = 'multiply' | 'divide'
export type AnyOp = Op | MulOp

export interface MulProblem {
  op: MulOp
  a: Operand
  b: Operand
}

export type AnyProblem = Problem | MulProblem

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
  | 'toImproper'
  | 'cancel'
  | 'multiplyAcross'
  | 'flip'
  | 'divideByZero'

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
  | 'wrongOperation'
  | 'multipliedPartsSeparately'
  | 'forgotToConvertMixed'
  | 'forgotReciprocal'
  | 'flippedWrongFraction'
  | 'cancellingSlip'
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

/** True when the top and bottom share no factor except 1 (a positive fraction in lowest terms). */
export function isSimplestFraction(f: Fraction): boolean {
  const { numerator, denominator } = makeFraction(f.numerator, f.denominator)
  return numerator > 0 && gcd(numerator, denominator) === 1
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
  const symbol = op === 'add' ? '+' : '-'
  const lcd = lcm(a.den, b.den)
  const aRenamed = a.num * (lcd / a.den)
  const bRenamed = b.num * (lcd / b.den)
  const result = (op === 'add' ? add : subtract)(problem.a, problem.b)
  const steps: Step[] = []

  if (a.den !== b.den) {
    steps.push({
      kind: 'rename',
      description: `Rename both fractions so they share the denominator ${lcd}.`,
      expression: `${rawStr(a.whole, aRenamed, lcd)} ${symbol} ${rawStr(b.whole, bRenamed, lcd)}`,
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
      expression: `${aWhole} ${symbol} ${b.whole} = ${whole}`,
    })
  }
  if (aRenamed > 0 || bRenamed > 0) {
    steps.push({
      kind: op === 'add' ? 'addNumerators' : 'subtractNumerators',
      description: `${op === 'add' ? 'Add' : 'Subtract'} the numerators and keep the denominator ${lcd}.`,
      expression: `${aNum}/${lcd} ${symbol} ${bRenamed}/${lcd} = ${num}/${lcd}`,
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
  let status: AnswerStatus = 'wrong'
  if (parsed && equals(expected, toImproper(parsed))) {
    status = isSimplestMixed(parsed) ? 'correct' : 'correctNotSimplest'
  }
  return { status, simplestForm }
}

// Hints are one short question each, so they never lecture and never give the answer.
const HINTS: Record<Slip, string> = {
  none: '',
  addedDenominators: 'Do the bottom numbers get added? What should match first?',
  noCommonDenominator: 'Are the pieces the same size? How could you match them?',
  forgotRegroup: 'Can you take away that many pieces? Where could you borrow from?',
  numeratorArithmetic: 'Whole number looks good. Check the top numbers again?',
  wholeArithmetic: 'Fraction looks good. Check the whole numbers again?',
  notSimplified: 'Right amount! Can the fraction be written smaller?',
  wrongOperation: 'Are we putting together or taking away?',
  multipliedPartsSeparately: 'Do wholes and fractions multiply separately, or should you change them first?',
  forgotToConvertMixed: 'What should you do to a mixed number before multiplying or dividing?',
  forgotReciprocal: 'What do you do to the second fraction when you divide?',
  flippedWrongFraction: 'Which fraction gets flipped when you divide?',
  cancellingSlip: 'Which top number and which bottom number can cancel?',
  unknown: 'What should you check about the denominators first?',
}

/** Multiplying is repeated adding, so an answer that adds is a good time to say so. */
export const REPEATED_ADDITION_HINT = 'Multiplying is repeated adding. How many times should you add it?'
/** For mixing up multiplying and dividing: taking a part of something, or splitting it up. */
export const PART_OR_SPLIT_HINT = 'Are we taking a part of it, or splitting it up?'
/** For an add or subtract problem answered with a multiplication or division result. */
export const NOT_REPEAT_OR_SPLIT_HINT = 'We aren’t repeating or splitting. Are we putting together or taking away?'

/** For multiplication and division, a few slips need different words than adding and subtracting. */
const MUL_DIV_HINTS: Partial<Record<Slip, string>> = {
  numeratorArithmetic: 'Check the top and bottom numbers you multiplied again?',
  unknown: 'What is the first thing to do with these numbers?',
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
export function diagnose(problem: AnyProblem, studentInput: string): Diagnosis {
  return isMulProblem(problem) ? diagnoseMulDiv(problem, studentInput) : diagnoseAddSub(problem, studentInput)
}

function isMulProblem(problem: AnyProblem): problem is MulProblem {
  return problem.op === 'multiply' || problem.op === 'divide'
}

function diagnoseAddSub(problem: Problem, studentInput: string): Diagnosis {
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

  // Her answer is the right answer to the opposite operation (added instead of subtracted, or the reverse).
  const otherResult = (problem.op === 'add' ? subtract : add)(problem.a, problem.b)
  if (!isNegative(otherResult) && equals(otherResult, value)) {
    return diagnosis('wrongOperation', null)
  }
  // Her answer is a multiplication or division result: she repeated or split instead of putting together or taking away.
  const repeatedOrSplit = [
    guess(() => multiply(problem.a, problem.b)),
    guess(() => divide(problem.a, problem.b)),
    guess(() => divide(problem.b, problem.a)),
  ]
  if (repeatedOrSplit.some((candidate) => sameValue(value, candidate))) {
    return { slip: 'wrongOperation', stepIndex: null, hint: NOT_REPEAT_OR_SPLIT_HINT }
  }

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
 * Checks a result by working backwards. For subtraction, result + b should equal a; for addition,
 * result - b should equal a; for multiplication, result ÷ b should equal a; for division,
 * result × b should equal a. Returns the check as an expression to show the student.
 * When the check would divide by zero (a × 0, or a division by zero), it can't hold.
 */
export function verifyByInverse(
  op: AnyOp,
  a: Operand,
  b: Operand,
  result: Operand,
): { holds: boolean; expression: string } {
  if (op === 'multiply') {
    const back = divide(result, b)
    return {
      holds: back.ok && equals(back.value, a),
      expression: `${formatMixed(result)} ÷ ${formatMixed(b)} = ${formatMixed(a)}`,
    }
  }
  if (op === 'divide') {
    return {
      holds: !isZero(b) && equals(multiply(result, b), a),
      expression: `${formatMixed(result)} × ${formatMixed(b)} = ${formatMixed(a)}`,
    }
  }
  const back = op === 'subtract' ? add(result, b) : subtract(result, b)
  const symbol = op === 'subtract' ? '+' : '-'
  return {
    holds: equals(back, a),
    expression: `${formatMixed(result)} ${symbol} ${formatMixed(b)} = ${formatMixed(a)}`,
  }
}

/** The correct answer to any problem, or null when it has none (dividing by zero). */
export function problemAnswer(problem: AnyProblem): Fraction | null {
  switch (problem.op) {
    case 'add':
      return add(problem.a, problem.b)
    case 'subtract':
      return subtract(problem.a, problem.b)
    case 'multiply':
      return multiply(problem.a, problem.b)
    case 'divide': {
      const result = divide(problem.a, problem.b)
      return result.ok ? result.value : null
    }
  }
}

/** The sign used to write an operation: + − × ÷ */
export function opSymbol(op: AnyOp): string {
  return { add: '+', subtract: '−', multiply: '×', divide: '÷' }[op]
}

/** The operation as a word, for reading aloud: "plus", "minus", "times", "divided by". */
export function opWord(op: AnyOp): string {
  return { add: 'plus', subtract: 'minus', multiply: 'times', divide: 'divided by' }[op]
}

/**
 * The opposite problem used to prove an answer: for a - b = r it is r + b, for a + b = r it is r - b,
 * for a × b = r it is r ÷ b, and for a ÷ b = r it is r × b. The inverse's own answer is always `a`.
 * Pass `answer` to build it from a student's answer instead of the correct one; if that answer
 * is wrong, the inverse does not give `a` back, which is how a wrong answer gets caught.
 */
export function inverseProblem(problem: Problem, answer?: Operand): Problem
export function inverseProblem(problem: MulProblem, answer?: Operand): MulProblem
export function inverseProblem(problem: AnyProblem, answer?: Operand): AnyProblem
export function inverseProblem(problem: AnyProblem, answer?: Operand): AnyProblem {
  const result = answer ?? problemAnswer(problem) ?? { numerator: 0, denominator: 1 }
  switch (problem.op) {
    case 'add':
      return { op: 'subtract', a: result, b: problem.b }
    case 'subtract':
      return { op: 'add', a: result, b: problem.b }
    case 'multiply':
      return { op: 'divide', a: result, b: problem.b }
    case 'divide':
      return { op: 'multiply', a: result, b: problem.b }
  }
}

/** Rounds a non-negative value to the nearest half or whole (2 1/4 -> 2 1/2, 2 1/8 -> 2). Ties round up. */
export function roundToHalf(x: Operand): Fraction {
  const f = toFraction(x)
  if (f.numerator < 0) throw new RangeError('roundToHalf only supports non-negative values')
  // halves = round(2n / d), done with integers: floor((4n + d) / (2d))
  const halves = Math.floor((4 * f.numerator + f.denominator) / (2 * f.denominator))
  return simplify(makeFraction(halves, 2))
}

/** An estimate is "close" when it is within half a whole of the answer. */
export const ESTIMATE_TOLERANCE: Fraction = { numerator: 1, denominator: 2 }

export interface EstimateCheck {
  roundedA: Fraction
  roundedB: Fraction
  /** The rounded numbers combined: what the answer should be about. */
  estimate: Fraction
  /** How far the answer is from the estimate (never negative). */
  difference: Fraction
  /** True when the answer is within half a whole of the estimate (for × and ÷: inside the range the rounding allows). */
  close: boolean
  /** False when the numbers are too small to estimate (a divisor under 1/4 rounds to 0). Then `close` is true. */
  reliable: boolean
}

/**
 * Checks an answer by estimating: round each number to the nearest half or whole, combine them,
 * and see if the answer is close. Each rounding is off by at most 1/4, so a correct answer is
 * always within 1/2 of the estimate; one that is farther away has gone off track.
 */
export function estimateCheck(a: Operand, b: Operand, op: AnyOp, answer: Operand): EstimateCheck {
  if (op === 'multiply' || op === 'divide') return estimateMulDiv(a, b, op, answer)
  const roundedA = roundToHalf(a)
  const roundedB = roundToHalf(b)
  const estimate = (op === 'add' ? add : subtract)(roundedA, roundedB)
  const gap = subtract(estimate, answer)
  const difference = { numerator: Math.abs(gap.numerator), denominator: gap.denominator }
  return {
    roundedA,
    roundedB,
    estimate,
    difference,
    close: difference.numerator * ESTIMATE_TOLERANCE.denominator <= ESTIMATE_TOLERANCE.numerator * difference.denominator,
    reliable: true,
  }
}

// ---------------------------------------------------------------------------
// Multiplication and division
// ---------------------------------------------------------------------------

/** What division and reciprocal return, because dividing by zero has no answer (and must never throw). */
export type DivideResult =
  | { ok: true; value: Fraction }
  | { ok: false; error: 'divisionByZero'; message: string }

const DIVISION_BY_ZERO: DivideResult = {
  ok: false,
  error: 'divisionByZero',
  message: 'You can’t divide by zero.',
}

/** True when the value is exactly zero (0, 0/4, "0 0/5"). */
export function isZero(x: Operand): boolean {
  return toFraction(x).numerator === 0
}

/** Negative if a < b, zero if equal, positive if a > b. Integers only. */
export function compare(a: Operand, b: Operand): number {
  const x = toFraction(a)
  const y = toFraction(b)
  return x.numerator * y.denominator - y.numerator * x.denominator
}

/** a × b, always simplified. Common factors are cancelled first, which keeps the numbers small. */
export function multiply(a: Operand, b: Operand): Fraction {
  const x = toFraction(a)
  const y = toFraction(b)
  const g1 = gcd(x.numerator, y.denominator) || 1
  const g2 = gcd(y.numerator, x.denominator) || 1
  return simplify(
    makeFraction(
      (x.numerator / g1) * (y.numerator / g2),
      (x.denominator / g2) * (y.denominator / g1),
    ),
  )
}

/** Flips a fraction: 3/4 becomes 4/3, and a whole number n becomes 1/n. The reciprocal of zero is an error. */
export function reciprocal(a: Operand): DivideResult {
  const f = toFraction(a)
  if (f.numerator === 0) return DIVISION_BY_ZERO
  // Keep the denominator positive: the sign moves to the top.
  const sign = f.numerator < 0 ? -1 : 1
  return { ok: true, value: simplify(makeFraction(sign * f.denominator, Math.abs(f.numerator))) }
}

/** a ÷ b, always simplified. Dividing by zero returns an error result instead of throwing. */
export function divide(a: Operand, b: Operand): DivideResult {
  const flipped = reciprocal(b)
  if (!flipped.ok) return flipped
  return { ok: true, value: multiply(a, flipped.value) }
}

// --- Worked steps ---

interface Parts {
  n: number
  d: number
}

/** The top and bottom of an operand written as one fraction, without reducing. Needs a non-negative value. */
function partsOf(x: Operand): Parts {
  const f = toFraction(x)
  if (f.numerator < 0) throw new RangeError('Steps only support non-negative operands')
  return { n: f.numerator, d: f.denominator }
}

function shown(x: Operand): string {
  if ('numerator' in x) return x.denominator === 1 ? String(x.numerator) : `${x.numerator}/${x.denominator}`
  if (x.num === 0) return String(x.whole)
  return x.whole === 0 ? `${x.num}/${x.den}` : `${x.whole} ${x.num}/${x.den}`
}

function frac(p: Parts): string {
  return `${p.n}/${p.d}`
}

/** Mixed numbers and whole numbers need changing into plain fractions first. */
function needsFraction(x: Operand): boolean {
  return !/^\d+\/\d+$/.test(shown(x))
}

/** The steps from cancelling onward, for two plain fractions being multiplied. */
function multiplyCoreSteps(x: Parts, y: Parts): Step[] {
  const steps: Step[] = []
  let left = x
  let right = y

  if (x.n > 0 && y.n > 0) {
    const g1 = gcd(x.n, y.d)
    const g2 = gcd(y.n, x.d)
    if (g1 > 1 || g2 > 1) {
      const notes: string[] = []
      if (g1 > 1) notes.push(`${x.n} and ${y.d} can both be divided by ${g1}`)
      if (g2 > 1) notes.push(`${y.n} and ${x.d} can both be divided by ${g2}`)
      left = { n: x.n / g1, d: x.d / g2 }
      right = { n: y.n / g2, d: y.d / g1 }
      steps.push({
        kind: 'cancel',
        description: `Cancel first: ${notes.join(', and ')}.`,
        expression: `${frac(x)} × ${frac(y)} = ${frac(left)} × ${frac(right)}`,
      })
    }
  }

  const top = left.n * right.n
  const bottom = left.d * right.d
  steps.push({
    kind: 'multiplyAcross',
    description: 'Multiply the tops, then multiply the bottoms.',
    expression: `${frac(left)} × ${frac(right)} = ${top}/${bottom}`,
  })

  let n = top
  let d = bottom
  const g = gcd(top, bottom)
  if (g > 1) {
    n = top / g
    d = bottom / g
    steps.push({
      kind: 'simplify',
      description: `Make the fraction smaller by dividing the top and bottom by ${g}.`,
      expression: `${top}/${bottom} = ${n}/${d}`,
    })
  }

  if (d === 1) {
    steps.push({
      kind: 'toMixed',
      description: 'A fraction over 1 is just a whole number.',
      expression: `${n}/1 = ${n}`,
    })
  } else if (n >= d) {
    const whole = Math.floor(n / d)
    steps.push({
      kind: 'toMixed',
      description: 'The top is bigger than the bottom, so turn it into a mixed number.',
      expression: `${n}/${d} = ${whole} ${n - whole * d}/${d}`,
    })
  }
  return steps
}

/** The worked steps for a × b: improper fractions, cancel, multiply across, mixed number, answer. */
export function multiplySteps(a: Operand, b: Operand): Step[] {
  const x = partsOf(a)
  const y = partsOf(b)
  const steps: Step[] = []
  if (needsFraction(a) || needsFraction(b)) {
    steps.push({
      kind: 'toImproper',
      description: 'Change mixed numbers and whole numbers into fractions.',
      expression: `${shown(a)} × ${shown(b)} = ${frac(x)} × ${frac(y)}`,
    })
  }
  steps.push(...multiplyCoreSteps(x, y))
  steps.push({
    kind: 'answer',
    description: 'Put it together for the answer.',
    expression: formatMixed(multiply(a, b)),
  })
  return steps
}

/** The worked steps for a ÷ b: improper fractions, keep-change-flip, then multiply. Dividing by zero is one step. */
export function divideSteps(a: Operand, b: Operand): Step[] {
  const x = partsOf(a)
  const y = partsOf(b)
  if (y.n === 0) {
    return [
      {
        kind: 'divideByZero',
        description: 'You can’t divide by zero, so there is no answer.',
        expression: `${shown(a)} ÷ ${shown(b)}`,
      },
    ]
  }

  const steps: Step[] = []
  if (needsFraction(a) || needsFraction(b)) {
    steps.push({
      kind: 'toImproper',
      description: 'Change mixed numbers and whole numbers into fractions.',
      expression: `${shown(a)} ÷ ${shown(b)} = ${frac(x)} ÷ ${frac(y)}`,
    })
  }
  const flipped = { n: y.d, d: y.n }
  steps.push({
    kind: 'flip',
    description: 'Keep the first fraction, change ÷ to ×, and flip the second fraction.',
    expression: `${frac(x)} ÷ ${frac(y)} = ${frac(x)} × ${frac(flipped)}`,
  })
  steps.push(...multiplyCoreSteps(x, flipped))

  const answer = divide(a, b)
  steps.push({
    kind: 'answer',
    description: 'Put it together for the answer.',
    expression: answer.ok ? formatMixed(answer.value) : '',
  })
  return steps
}

/** The worked steps for any problem. */
export function workedSteps(problem: AnyProblem): Step[] {
  switch (problem.op) {
    case 'add':
      return addSteps(problem.a, problem.b)
    case 'subtract':
      return subtractSteps(problem.a, problem.b)
    case 'multiply':
      return multiplySteps(problem.a, problem.b)
    case 'divide':
      return divideSteps(problem.a, problem.b)
  }
}

// --- Slip diagnosis ---

/** A mixed number with both a whole part and a fraction part, such as 2 1/2. */
function mixedParts(x: Operand): { whole: Fraction; part: Fraction } | null {
  if ('numerator' in x) {
    if (x.denominator === 1 || x.numerator < x.denominator) return null
    const m = toMixed(x)
    return m.num > 0 && m.whole > 0 ? { whole: makeFraction(m.whole, 1), part: makeFraction(m.num, m.den) } : null
  }
  return x.whole > 0 && x.num > 0 ? { whole: makeFraction(x.whole, 1), part: makeFraction(x.num, x.den) } : null
}

/** A candidate wrong answer, or null if it can't be worked out (bad numbers, zero divisor). */
function guess(make: () => Fraction | DivideResult): Fraction | null {
  try {
    const result = make()
    if ('ok' in result) return result.ok ? result.value : null
    return result
  } catch {
    return null
  }
}

function sameValue(value: Fraction, candidate: Fraction | null): boolean {
  return candidate !== null && equals(value, candidate)
}

function diagnoseMulDiv(problem: MulProblem, studentInput: string): Diagnosis {
  const { a, b } = problem
  const isDivide = problem.op === 'divide'
  const diagnosis = (slip: Slip, idx: number | null): Diagnosis => ({
    slip,
    stepIndex: idx,
    hint: MUL_DIV_HINTS[slip] ?? HINTS[slip],
  })

  const p = parseMixed(studentInput)
  if (!p) return diagnosis('unknown', null)

  const answer = isDivide ? divide(a, b) : { ok: true as const, value: multiply(a, b) }
  if (!answer.ok) return diagnosis('unknown', null)
  const expected = answer.value

  let steps: Step[]
  try {
    steps = workedSteps(problem)
  } catch {
    return diagnosis('unknown', null)
  }
  const value = toImproper(p)
  const last = steps.length - 1

  if (equals(expected, value)) {
    return isSimplestMixed(p)
      ? diagnosis('none', null)
      : diagnosis('notSimplified', stepIndex(steps, 'simplify', 'toMixed') ?? last)
  }

  const convertStep = stepIndex(steps, 'toImproper') ?? 0
  const ma = mixedParts(a)
  const mb = mixedParts(b)
  const operate = (x: Operand, y: Operand): Fraction | DivideResult => (isDivide ? divide(x, y) : multiply(x, y))

  // 2 1/2 × 3 1/3 answered as 6 1/6: wholes and fractions multiplied on their own.
  if (ma && mb) {
    const separate = guess(() => add(guess(() => operate(ma.whole, mb.whole))!, guess(() => operate(ma.part, mb.part))!))
    if (sameValue(value, separate)) {
      return diagnosis(isDivide ? 'forgotToConvertMixed' : 'multipliedPartsSeparately', convertStep)
    }
  }
  // One mixed number: only its whole part, or only its fraction part, was multiplied or divided.
  if (ma && !mb && (!isDivide || mixedParts(a))) {
    const other = b
    const wholeOnly = guess(() => add(guess(() => operate(ma.whole, other))!, ma.part))
    const partOnly = guess(() => add(ma.whole, guess(() => operate(ma.part, other))!))
    if (sameValue(value, wholeOnly) || sameValue(value, partOnly)) return diagnosis('forgotToConvertMixed', convertStep)
  }
  if (mb && !ma && !isDivide) {
    const wholeOnly = guess(() => add(guess(() => multiply(a, mb.whole))!, mb.part))
    const partOnly = guess(() => add(mb.whole, guess(() => multiply(a, mb.part))!))
    if (sameValue(value, wholeOnly) || sameValue(value, partOnly)) return diagnosis('forgotToConvertMixed', convertStep)
  }

  if (isDivide) {
    const flipIndex = stepIndex(steps, 'flip') ?? 0
    // 2/3 ÷ 4/9 answered as 8/27: multiplied without flipping.
    if (sameValue(value, guess(() => multiply(a, b)))) return diagnosis('forgotReciprocal', flipIndex)
    // 2/3 ÷ 4/9 answered as 2/3: flipped the first fraction instead of the second.
    if (sameValue(value, guess(() => multiply(guess(() => reciprocal(a))!, b)))) {
      return diagnosis('flippedWrongFraction', flipIndex)
    }
  }

  // Her answer is the right answer to a different operation.
  const gap = (x: Operand, y: Operand): Fraction => (compare(x, y) >= 0 ? subtract(x, y) : subtract(y, x))
  if (!isDivide && sameValue(value, add(a, b))) {
    // 2/3 × 3/4 answered as 2/3 + 3/4: she added. Multiplying is repeated adding.
    return { slip: 'wrongOperation', stepIndex: null, hint: REPEATED_ADDITION_HINT }
  }
  const others = isDivide
    ? [guess(() => add(a, b)), guess(() => gap(a, b))]
    : [guess(() => gap(a, b)), guess(() => divide(a, b)), guess(() => divide(b, a))]
  if (others.some((candidate) => sameValue(value, candidate))) {
    return { slip: 'wrongOperation', stepIndex: null, hint: PART_OR_SPLIT_HINT }
  }

  // Cancelled top with top, or bottom with bottom, which is not allowed.
  const x = partsOf(a)
  const y = isDivide ? { n: partsOf(b).d, d: partsOf(b).n } : partsOf(b)
  const topCommon = gcd(x.n, y.n)
  const bottomCommon = gcd(x.d, y.d)
  const wrongCancels: Array<Fraction | null> = []
  if (topCommon > 1) {
    wrongCancels.push(guess(() => makeFraction((x.n / topCommon) * (y.n / topCommon), x.d * y.d)))
  }
  if (bottomCommon > 1) {
    wrongCancels.push(guess(() => makeFraction(x.n * y.n, (x.d / bottomCommon) * (y.d / bottomCommon))))
  }
  if (wrongCancels.some((c) => sameValue(value, c))) {
    return diagnosis('cancellingSlip', stepIndex(steps, 'cancel', 'multiplyAcross'))
  }

  // Right bottom number, wrong top number: an arithmetic slip while multiplying.
  const target = simplify(expected)
  const across = steps.find((s) => s.kind === 'multiplyAcross')
  const acrossBottom = across ? Number(across.expression.split(' = ').pop()?.split('/')[1]) : NaN
  if (value.denominator === target.denominator || value.denominator === acrossBottom) {
    return diagnosis('numeratorArithmetic', stepIndex(steps, 'multiplyAcross'))
  }

  return diagnosis('unknown', null)
}

// --- Estimating and the size rule ---

const QUARTER: Fraction = { numerator: 1, denominator: 4 }
const HALF: Fraction = { numerator: 1, denominator: 2 }

/**
 * Estimating for × and ÷. Each number is rounded to the nearest half or whole and so can be off by up to
 * 1/4. Adding 1/2 doesn't work for products (8 1/5 × 4 3/4 is nearly 39 but 8 × 5 is 40), so "close"
 * means inside the range the answer could really be in, which a correct answer always is.
 */
function estimateMulDiv(a: Operand, b: Operand, op: MulOp, answer: Operand): EstimateCheck {
  const roundedA = roundToHalf(a)
  let roundedB = roundToHalf(b)
  // A divisor under 1/4 rounds to 0, which can't be divided by. Estimating is too rough there.
  const unreliable = op === 'divide' && (isZero(b) || isZero(roundedB))
  if (unreliable) roundedB = HALF

  const quotient = divide(roundedA, roundedB)
  const estimate = op === 'multiply' ? multiply(roundedA, roundedB) : quotient.ok ? quotient.value : HALF
  const gap = subtract(estimate, answer)
  const difference = { numerator: Math.abs(gap.numerator), denominator: gap.denominator }
  if (unreliable) return { roundedA, roundedB, estimate, difference, close: true, reliable: false }

  const below = (x: Fraction): Fraction => {
    const lower = subtract(x, QUARTER)
    return lower.numerator < 0 ? { numerator: 0, denominator: 1 } : lower
  }
  const above = (x: Fraction): Fraction => add(x, QUARTER)
  const low = op === 'multiply' ? multiply(below(roundedA), below(roundedB)) : guess(() => divide(below(roundedA), above(roundedB)))
  const high = op === 'multiply' ? multiply(above(roundedA), above(roundedB)) : guess(() => divide(above(roundedA), below(roundedB)))
  const close = low !== null && high !== null && compare(answer, low) >= 0 && compare(answer, high) <= 0
  return { roundedA, roundedB, estimate, difference, close, reliable: true }
}

export interface SizeCheck {
  /** False when the rule has nothing to say (neither number is a fraction between 0 and 1). */
  applies: boolean
  /** False when the answer breaks the rule. */
  ok: boolean
  /** A kid-friendly sentence when the rule is broken, otherwise null. */
  message: string | null
}

const isBetweenZeroAndOne = (x: Operand): boolean => compare(x, { numerator: 0, denominator: 1 }) > 0 && compare(x, { numerator: 1, denominator: 1 }) < 0
const isPositive = (x: Operand): boolean => compare(x, { numerator: 0, denominator: 1 }) > 0

/**
 * The size rule for deep understanding. Multiplying by a fraction less than 1 makes the number smaller,
 * so the answer must be smaller than it. Dividing by a fraction less than 1 makes the number bigger,
 * so the answer must be bigger than it. Returns a message when an answer breaks the rule.
 */
export function sizeCheck(op: MulOp, a: Operand, b: Operand, answer: Operand): SizeCheck {
  if (op === 'multiply') {
    // Either factor can be the fraction, since a × b = b × a.
    const pairs: Array<[Operand, Operand]> = [[b, a], [a, b]]
    let applies = false
    for (const [factor, other] of pairs) {
      if (!isBetweenZeroAndOne(factor) || !isPositive(other)) continue
      applies = true
      if (compare(answer, other) >= 0) {
        return {
          applies,
          ok: false,
          message: `${formatMixed(factor)} is less than 1, so multiplying makes ${formatMixed(other)} smaller. Check your answer.`,
        }
      }
    }
    return { applies, ok: true, message: null }
  }

  if (!isBetweenZeroAndOne(b) || !isPositive(a)) return { applies: false, ok: true, message: null }
  if (compare(answer, a) <= 0) {
    return {
      applies: true,
      ok: false,
      message: `${formatMixed(b)} is less than 1, so dividing makes ${formatMixed(a)} bigger. Check your answer.`,
    }
  }
  return { applies: true, ok: true, message: null }
}
