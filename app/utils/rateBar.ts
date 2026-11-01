import { divide, formatMixed, multiply, parseMixed, simplify, subtract, toFraction, toMixed, type Fraction } from './fraction'
import { resolvePlan, type Plan, type PlanStep, type RateSpec } from './plan'
import type { BarMark, BarStage } from './fractionBar'
import { withUnit } from './unitBar'

/**
 * "The same amount is used each day" problems: 3/5 of the oil is left after 6 days, and 4 2/3 litres after 5 more
 * days; how much was there at first? Code builds the steps in the order a child would think them (what fraction was
 * used, how many days for all of it, which day it is now, how many days are left, how much a day, how much in all),
 * checks every step with the fraction engine and draws a day strip. The AI only reads the shape and the words.
 */
const MAX_CELLS = 48
const ONE: Fraction = { numerator: 1, denominator: 1 }

const wholeNumber = (text: string): number | null => {
  const n = Number(text.trim())
  return Number.isInteger(n) && n >= 1 && n <= 99 ? n : null
}

const isInteger = (f: Fraction) => f.denominator === 1

export interface RatePlan {
  plan: Plan
  /** How much there was at the start. */
  total: Fraction
  /** The day strip, or null when the days would not divide into whole cells; the steps still work. */
  stages: BarStage[] | null
  /** Days to use it all, for the warm-up. */
  days: number
}

export function buildRatePlan(spec: RateSpec, whole?: string): RatePlan | null {
  const d1 = wholeNumber(spec.first.days)
  const d2 = wholeNumber(spec.second.days)
  const leftM = parseMixed(spec.first.left)
  const amount = parseMixed(spec.second.amountLeft)
  if (d1 === null || d2 === null || !leftM || !amount) return null
  if (leftM.whole !== 0 || leftM.num <= 0 || leftM.num >= leftM.den) return null
  if (toFraction(amount).numerator <= 0) return null
  const w = whole?.trim() || 'it'
  const left = simplify(toFraction(leftM))

  const used = simplify(subtract(ONE, left))
  const daysAll = divide({ numerator: d1, denominator: 1 }, used)
  if (!daysAll.ok) return null
  const D = simplify(daysAll.value)
  // Every day must use the same amount and the oil must not run out before the second check.
  if (!isInteger(D) || D.numerator <= d1 + d2) return null
  const days = D.numerator
  const gone = d1 + d2
  const remaining = days - gone

  const steps: PlanStep[] = [
    { op: 'subtract', a: '1', b: spec.first.left.trim(), label: `What fraction of ${w} was used in the first days?` },
    { op: 'divide', a: String(d1), b: 'r1', label: `How many days would it take to use up all of ${w}?` },
    { op: 'add', a: String(d1), b: String(d2), label: 'How many days have gone by at the second check?' },
    { op: 'subtract', a: 'r2', b: 'r3', label: `How many days are left until ${w} is used up?` },
    { op: 'divide', a: spec.second.amountLeft.trim(), b: 'r4', label: `How much of ${w} is used in one day?` },
    { op: 'multiply', a: 'r5', b: 'r2', label: `How much of ${w} was there at the start?` },
  ]
  const plan: Plan = { steps, whole: w, rate: spec }
  const check = resolvePlan(plan)
  if (!check.ok) return null

  const perDay = divide(amount, { numerator: remaining, denominator: 1 })
  if (!perDay.ok) return null
  const total = simplify(multiply(perDay.value, D))
  const last = toFraction(check.results.at(-1)!)
  if (last.numerator * total.denominator !== total.numerator * last.denominator) return null

  return { plan, total, days, stages: stagesFor(spec, w, used, days, d1, d2, amount, perDay.value, total) }
}

function stagesFor(
  spec: RateSpec,
  w: string,
  used: Fraction,
  days: number,
  d1: number,
  d2: number,
  amount: NonNullable<ReturnType<typeof parseMixed>>,
  perDay: Fraction,
  total: Fraction,
): BarStage[] | null {
  const parts = used.denominator
  if (days > MAX_CELLS || days % parts !== 0) return null
  const factor = days / parts
  const gone = d1 + d2
  const remaining = days - gone
  const unit = spec.unit?.trim()
  const amountText = withUnit(formatMixed(amount), unit)
  const perDayText = withUnit(formatMixed(toMixed(simplify(perDay))), unit)
  const totalText = withUnit(formatMixed(toMixed(total)), unit)
  const mark = (start: number, count: number, tone: number, label: string, result: boolean, phase: 1 | 2): BarMark => ({
    start,
    count,
    tone,
    label,
    result,
    phase,
  })

  const s0 = [
    mark(0, used.numerator, 0, 'used in the first days', true, 2),
    mark(used.numerator, parts - used.numerator, 1, `${w} still left`, false, 1),
  ]
  const hidden = (m: BarMark) => ({ ...m, start: m.start * factor, count: m.count * factor, result: false })
  const s1 = [
    { ...hidden(s0[0]!), label: `first ${d1} days` },
    { ...hidden(s0[1]!), label: '' },
    mark(days - 1, 1, 5, `day ${days}: all used up`, true, 2),
  ]
  const s2 = [...s1.map((m) => ({ ...m, result: false })), mark(d1, d2, 2, `${d2} more days: day ${gone}`, true, 2)]
  const s3 = [...s2.map((m) => ({ ...m, result: false })), mark(gone, remaining, 3, `${remaining} days left = ${amountText}`, true, 2)]
  const s4 = [...s3.map((m) => ({ ...m, result: false })), mark(gone, 1, 4, `1 day = ${perDayText}`, true, 2)]
  const s5 = [...s4.map((m) => ({ ...m, result: false })), mark(0, 1, 0, `every day uses ${perDayText}`, true, 2)]

  const stage = (step: number, before: { cells: number; marks: BarMark[] }, marks: BarMark[], cells: number, whole: string, caption: string): BarStage => ({
    step,
    before,
    after: { cells, marks },
    whole,
    caption,
  })
  const unknown = `${w}: ?`
  return [
    stage(0, { cells: parts, marks: [] }, s0, parts, unknown, `The ${w} is cut into ${parts} equal parts. ${used.numerator} of them were used in the first ${d1} days.`),
    stage(1, { cells: parts, marks: s0 }, s1, days, `${w}: ${days} days to use it all`, `Each part is ${factor} days, so ${d1} days is ${used.numerator} of ${parts} parts, and all ${parts} parts take ${days} days.`),
    stage(2, { cells: days, marks: s1 }, s2, days, `${w}: ${days} days to use it all`, `${d2} more days after day ${d1} make day ${gone}.`),
    stage(3, { cells: days, marks: s2 }, s3, days, `${w}: ${days} days to use it all`, `From day ${gone} to day ${days} there are ${remaining} days left, and ${amountText} is left.`),
    stage(4, { cells: days, marks: s3 }, s4, days, `${w}: ${days} days to use it all`, `${remaining} equal days share ${amountText}, so one day uses ${perDayText}.`),
    stage(5, { cells: days, marks: s4 }, s5, days, `${w} = ${totalText}`, `All ${days} days use ${perDayText} each, so there was ${totalText} at the start.`),
  ]
}
