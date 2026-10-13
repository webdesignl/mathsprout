import {
  add,
  formatMixed,
  simplify,
  subtract,
  toFraction,
  toMixed,
  type Problem,
  type Step,
} from '../../../app/utils/fraction'

/**
 * Answer-leak guard. A hint must never state the final answer or the result of the step it is about.
 * This checks the hint text for those numbers, in the forms a student could read them:
 * "3 9/20", "3 and 9/20", "69/20", the result of the flagged step ("9/20", or its top number "9"),
 * and spelled-out numbers ("nine").
 */

const FRACTION_OR_NUMBER = /\d+\s*\/\s*\d+|\d+/g

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
]
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/** English words for 0 to 99, or null for bigger numbers. */
export function numberWord(n: number): string | null {
  if (!Number.isInteger(n) || n < 0 || n > 99) return null
  if (n < 20) return ONES[n]!
  const tens = TENS[Math.floor(n / 10)]!
  return n % 10 === 0 ? tens : `${tens}[- ]${ONES[n % 10]}`
}

function tokensOf(text: string): string[] {
  return (text.match(FRACTION_OR_NUMBER) ?? []).map((t) => t.replace(/\s+/g, ''))
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}

/** The numbers that stand for the result of one step. */
export function stepResultTokens(problem: Problem, steps: Step[], index: number): string[] {
  const step = steps[index]
  if (!step) return []

  const eq = step.expression.lastIndexOf(' = ')
  if (eq !== -1) {
    // "24/20 - 15/20 = 9/20": the result is "9/20", and its top number "9" gives it away too.
    const result = tokensOf(step.expression.slice(eq + 3))
    const tops = result.flatMap((t) => (t.includes('/') ? [t.split('/')[0]!] : []))
    return unique([...result, ...tops])
  }

  // "7 24/20 - 4 15/20" has no "=": the result is whatever is new compared with the step before it.
  const before =
    index > 0
      ? steps[index - 1]!.expression
      : [problem.a, problem.b].map((o) => ('whole' in o ? `${o.whole} ${o.num}/${o.den}` : '')).join(' ')
  const known = new Set(tokensOf(before))
  return unique(tokensOf(step.expression).filter((t) => !known.has(t)))
}

function bareNumber(n: string): string {
  return `(?<![\\d/.])${n}(?![\\d.])`
}

function fraction(n: string, d: string): string {
  return `(?<![\\d/.])${n}\\s*/\\s*${d}(?!\\d)`
}

/** Regular expressions for everything a hint must not say. */
export function forbiddenPatterns(problem: Problem, steps: Step[], flaggedIndex: number): RegExp[] {
  const patterns: string[] = []
  const bareNumbers: string[] = []

  const answer = (problem.op === 'add' ? add : subtract)(problem.a, problem.b)
  if (answer.numerator >= 0) {
    const m = toMixed(answer)
    const improper = simplify(toFraction(answer))
    if (m.num === 0) {
      bareNumbers.push(String(m.whole))
    } else {
      if (m.whole > 0) {
        patterns.push(`(?<![\\d/.])${m.whole}(?:\\s+and\\s+|\\s*-\\s*|\\s+)${m.num}\\s*/\\s*${m.den}(?!\\d)`)
      }
      patterns.push(fraction(String(m.num), String(m.den)))
      patterns.push(fraction(String(improper.numerator), String(improper.denominator)))
    }
    patterns.push(`(?<![\\d/.])${formatMixed(answer).replace(/\s+/g, '\\s+')}(?![\\d])`)
  }

  for (const token of stepResultTokens(problem, steps, flaggedIndex)) {
    if (token.includes('/')) {
      const [n, d] = token.split('/')
      patterns.push(fraction(n!, d!))
    } else {
      bareNumbers.push(token)
    }
  }

  for (const n of unique(bareNumbers)) {
    patterns.push(bareNumber(n))
    const word = numberWord(Number(n))
    if (word) patterns.push(`\\b${word}\\b`)
  }
  return patterns.map((p) => new RegExp(p, 'i'))
}

/** True when the hint states the final answer or the result of the flagged step. */
export function leaksAnswer(hint: string, problem: Problem, steps: Step[], flaggedIndex: number): boolean {
  const text = hint.replace(/\s+/g, ' ')
  return forbiddenPatterns(problem, steps, flaggedIndex).some((re) => re.test(text))
}
