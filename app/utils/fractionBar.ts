import { parseMixed, toFraction, type Fraction, type MixedNumber } from './fraction'
import { resolvePlan, type Plan } from './plan'

/**
 * The bar model for a "fraction of the rest" problem, drawn one step at a time. Code builds it from the plan
 * and checks that the shaded part of every stage equals the fraction engine's answer for that step, so the
 * picture can never disagree with the maths. The AI only supplies the words on it.
 */
export interface BarMark {
  /** First cell and number of cells, counted in the bar's cells at this stage. */
  start: number
  count: number
  /** 0 is the part that was given; each later step brings the next colour. */
  tone: number
  label: string
  /** Outlined and named: the part this step finds. */
  result: boolean
  /** The animation shows this mark in phase 1 (given) or phase 2 (the step's answer). */
  phase: 1 | 2
}

export interface BarSnapshot {
  cells: number
  marks: BarMark[]
}

export interface BarStage {
  step: number
  /** The bar before this step. Null for the first step, which starts with the bar cut into equal parts. */
  before: BarSnapshot
  after: BarSnapshot
  whole: string
  caption: string
}

const REF = /^r([1-9])$/i

interface Region {
  start: number
  count: number
}

const isWhole1 = (text: string) => {
  const m = parseMixed(text)
  return m !== null && m.whole === 1 && m.num === 0
}

/** A proper fraction a/b with 0 < a < b, as numbers. */
function properFraction(text: string): { num: number; den: number } | null {
  const m: MixedNumber | null = parseMixed(text)
  if (!m || m.whole !== 0 || m.num <= 0 || m.num >= m.den) return null
  return { num: m.num, den: m.den }
}

const scale = (marks: BarMark[], by: number): BarMark[] =>
  marks.map((m) => ({ ...m, start: m.start * by, count: m.count * by }))

const sameValue = (a: Fraction, b: Fraction) => a.numerator * b.denominator === b.numerator * a.denominator

/**
 * One stage per step, or null when the plan is not the kind this picture handles
 * (subtracting from the whole, and taking a fraction of an earlier answer or of a fraction).
 */
export function buildBarStages(plan: Plan): BarStage[] | null {
  const check = resolvePlan(plan)
  if (!check.ok) return null
  const whole = plan.whole?.trim() || 'the whole'

  const stages: BarStage[] = []
  const regions: Region[] = []
  let cells = 0
  let marks: BarMark[] = []
  const tones = { next: 1 }

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i]!
    const aRef = REF.exec(step.a.trim())
    const bRef = REF.exec(step.b.trim())
    const name = step.name?.trim() || 'this part'
    const before: BarSnapshot = { cells, marks }
    let after: BarSnapshot
    let region: Region
    let caption: string

    if (step.op === 'subtract' && isWhole1(step.a) && (bRef || properFraction(step.b))) {
      const given = step.bName?.trim() || 'the part taken'
      if (bRef) {
        const taken = regions[Number(bRef[1]) - 1]
        if (!taken || cells === 0) return null
        const rest: Region | null =
          taken.start === 0
            ? { start: taken.count, count: cells - taken.count }
            : taken.start + taken.count === cells
              ? { start: 0, count: taken.start }
              : null
        if (!rest || rest.count <= 0) return null
        region = rest
        after = {
          cells,
          marks: [...marks, { ...rest, tone: tones.next++, label: name, result: true, phase: 2 }],
        }
        caption = `${whole}, minus the part we already found. The rest is ${name}.`
      } else {
        const f = properFraction(step.b)!
        if (cells !== 0) return null
        cells = f.den
        region = { start: f.num, count: f.den - f.num }
        const base: BarSnapshot = { cells, marks: [] }
        Object.assign(before, base)
        marks = [{ start: 0, count: f.num, tone: 0, label: given, result: false, phase: 1 }]
        after = {
          cells,
          marks: [...marks, { ...region, tone: tones.next++, label: name, result: true, phase: 2 }],
        }
        caption = `${whole} is cut into ${f.den} equal parts. ${f.num} are ${given}. The rest is ${name}.`
      }
    } else if (step.op === 'multiply') {
      const refs = [aRef, bRef].filter(Boolean)
      const fractions = [step.a, step.b].filter((t) => !REF.test(t.trim())).map(properFraction)
      let of: { num: number; den: number }
      let base: Region
      if (refs.length === 1 && fractions.length === 1 && fractions[0]) {
        of = fractions[0]
        const taken = regions[Number((aRef ?? bRef)![1]) - 1]
        if (!taken || cells === 0) return null
        base = taken
        const factor = of.den
        const scaled = scale(marks, factor)
        cells *= factor
        region = { start: base.start * factor, count: base.count * of.num }
        after = {
          cells,
          marks: [...scaled, { ...region, tone: tones.next++, label: name, result: true, phase: 2 }],
        }
        for (let k = 0; k < regions.length; k++) {
          regions[k] = { start: regions[k]!.start * factor, count: regions[k]!.count * factor }
        }
        caption = `Each part is cut into ${factor} equal parts. ${name} is ${of.num} of ${factor} in the part we took.`
      } else if (refs.length === 0 && fractions.length === 2 && fractions[0] && fractions[1] && cells === 0) {
        const first = fractions[0]
        of = fractions[1]
        const given = step.aName?.trim() || 'the first part'
        cells = first.den
        const start: BarSnapshot = {
          cells,
          marks: [{ start: 0, count: first.num, tone: 0, label: given, result: false, phase: 1 }],
        }
        Object.assign(before, start)
        const factor = of.den
        cells *= factor
        region = { start: 0, count: first.num * of.num }
        after = {
          cells,
          marks: [
            ...scale(start.marks, factor),
            { ...region, tone: tones.next++, label: name, result: true, phase: 2 },
          ],
        }
        caption = `${whole} is cut into ${first.den} equal parts, then each part into ${factor} more. ${name} is ${of.num} of ${factor} in the shaded part.`
      } else {
        return null
      }
    } else {
      return null
    }

    // The picture must show exactly the engine's answer for this step.
    const answer = toFraction(check.results[i]!)
    if (!sameValue({ numerator: region.count, denominator: cells }, answer)) return null

    regions[i] = region
    marks = after.marks
    stages.push({ step: i, before, after, whole, caption })
  }
  return stages
}
