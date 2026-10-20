import type { Slip } from './fraction'

/** What the Parent page needs from one attempts row. */
export interface AttemptLine {
  mode: string
  problem: string | null
  correct: boolean
  first_try: boolean
  hints_used: number
  error_type: string | null
}

export interface Summary {
  /** Problems finished in this window (the last 20 saved). */
  total: number
  /** Right first time with no hint. */
  smooth: number
  /** Needed a hint, a second try, or was missed. */
  struggled: number
  /** Problems done with the Tutor. */
  tutor: number
  mastered: string[]
  needsPractice: string[]
  patterns: { text: string; count: number }[]
}

const OP_WORDS: Record<string, string> = { '+': 'Adding', '-': 'Subtracting', '−': 'Subtracting', '×': 'Multiplying', '÷': 'Dividing' }

/** Names a problem's skill, like "Subtracting mixed numbers", from its saved text ("8 1/5 - 4 3/4"). */
export function skillOf(problem: string | null): string | null {
  if (!problem) return null
  const m = problem.match(/^(.+?) ([+\-−×÷]) (.+)$/)
  if (!m) return null
  const [, a, op, b] = m
  const word = OP_WORDS[op!]
  if (!word) return null
  const mixed = [a!, b!].some((x) => x.includes(' '))
  if (mixed) return `${word} mixed numbers`
  const dens = [a!, b!].map((x) => x.split('/')[1]).filter(Boolean)
  const unlike = (op === '+' || op === '-' || op === '−') && dens.length === 2 && dens[0] !== dens[1]
  return unlike ? `${word} fractions with unlike denominators` : `${word} fractions`
}

/** Plain words for the mistakes the engine can name. */
export const PATTERN_TEXT: Partial<Record<Slip, string>> = {
  numeratorArithmetic: 'Slips in the top-number arithmetic',
  wholeArithmetic: 'Slips in the whole-number arithmetic',
  forgotRegroup: 'Forgetting to regroup (borrow or carry)',
  addedDenominators: 'Adding the bottom numbers',
  noCommonDenominator: 'Not finding a common denominator',
  notSimplified: 'Not simplifying the answer',
  wrongOperation: 'Choosing the wrong operation',
  multipliedPartsSeparately: 'Multiplying whole and fraction parts separately',
  forgotToConvertMixed: 'Not turning mixed numbers into fractions first',
  forgotReciprocal: 'Forgetting to flip when dividing',
  flippedWrongFraction: 'Flipping the wrong fraction',
  cancellingSlip: 'Slips when cancelling',
}

const MASTERED_MIN_ATTEMPTS = 3
const STRUGGLE_MIN_ATTEMPTS = 2

/** A 5-minute read of the last 20 problems. Code counts everything; nothing here is written by AI. */
export function summarize(allLines: AttemptLine[]): Summary {
  // Deep Check answers are about understanding, not problems; they have their own summary.
  const lines = allLines.filter((l) => l.mode !== 'deep_check')
  const needsHelp = (l: AttemptLine) => !l.correct || !l.first_try || l.hints_used > 0
  const bySkill = new Map<string, AttemptLine[]>()
  for (const l of lines) {
    const skill = skillOf(l.problem)
    if (skill) bySkill.set(skill, [...(bySkill.get(skill) ?? []), l])
  }
  const mastered: string[] = []
  const needsPractice: string[] = []
  for (const [skill, group] of bySkill) {
    const helped = group.filter(needsHelp).length
    if (group.length >= MASTERED_MIN_ATTEMPTS && helped === 0) mastered.push(skill)
    else if (group.length >= STRUGGLE_MIN_ATTEMPTS && helped * 2 >= group.length) needsPractice.push(skill)
  }
  const counts = new Map<string, number>()
  for (const l of lines) {
    const text = l.error_type ? PATTERN_TEXT[l.error_type as Slip] : undefined
    if (text) counts.set(text, (counts.get(text) ?? 0) + 1)
  }
  const patterns = [...counts].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count).slice(0, 3)
  const struggled = lines.filter(needsHelp).length
  return {
    total: lines.length,
    smooth: lines.length - struggled,
    struggled,
    tutor: lines.filter((l) => l.mode === 'tutor').length,
    mastered: mastered.sort(),
    needsPractice: needsPractice.sort(),
    patterns,
  }
}
