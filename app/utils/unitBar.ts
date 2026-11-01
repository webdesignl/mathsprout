import {
  add,
  divide,
  formatMixed,
  lcm,
  multiply,
  parseMixed,
  simplify,
  subtract,
  toFraction,
  toMixed,
  type Fraction,
} from './fraction'
import { MAX_PLAN_STEPS, resolvePlan, type Plan, type PlanStep, type UnitSpec } from './plan'
import type { BarMark, BarSnapshot, BarStage } from './fractionBar'

/**
 * Unknown-whole problems ("gave 1/5 of it away; of the rest gave 1/4 and 1/8; then had $250 left; how much
 * was there at first?"). Code builds the plan steps, works out the whole with the fraction engine and draws the
 * unit bar. The AI only reads the shapes and writes the names. Returns null for anything it can't do exactly.
 */
const MAX_CELLS = 48
const MAX_GROUPS = 2
const MAX_TAKES = 3

const ONE: Fraction = { numerator: 1, denominator: 1 }

const fractionOf = (text: string): Fraction | null => {
  const m = parseMixed(text)
  if (!m || m.whole !== 0 || m.num <= 0 || m.num >= m.den) return null
  return simplify(toFraction(m))
}

/** The names joined for a sentence: "mom and sister", "mom, dad and sister". */
function joined(names: string[]): string {
  if (names.length <= 1) return names[0] ?? 'they'
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

/** Money goes in front ("$250"), other units after ("250 cm"). */
export function withUnit(value: string, unit?: string): string {
  if (!unit) return value
  return /^[$€£]$/.test(unit) ? `${unit}${value}` : `${value} ${unit}`
}

export interface UnitPlan {
  plan: Plan
  /** The whole at the start, worked out by the fraction engine. */
  total: Fraction
  /** Null when the cells would be too many or too small to draw; the steps still work. */
  stages: BarStage[] | null
}

export function buildUnitPlan(spec: UnitSpec, whole?: string): UnitPlan | null {
  if (spec.groups.length < 1 || spec.groups.length > MAX_GROUPS) return null
  const amount = parseMixed(spec.left.amount)
  if (!amount || toFraction(amount).numerator <= 0) return null
  const wholeName = whole?.trim() || 'the whole'

  const steps: PlanStep[] = []
  const push = (step: PlanStep) => steps.push(step) // returns the new length
  const ref = () => `r${steps.length}`

  // Each group's takes as fractions of what the group started with, and what is still left of that.
  const shares: Fraction[][] = []
  const stillLeft: Fraction[] = []
  const stepOfRem: number[] = []
  /** The step that combines the two groups' left-over fractions (none with one group), and the last step. */
  let combineStep = -1
  let combinedRef = ''
  let combinedValue: Fraction = ONE

  for (let g = 0; g < spec.groups.length; g++) {
    const group = spec.groups[g]
    if (!group) return null
    const takes = group.takes
    if (!takes || takes.length < 1 || takes.length > MAX_TAKES) return null
    const parsed = takes.map((t) => fractionOf(t.share))
    if (parsed.some((f) => f === null)) return null
    const fractions = parsed as Fraction[]
    const names = takes.map((t) => t.name?.trim()).filter((n): n is string => Boolean(n))
    const who = joined(names)

    let takenRef = takes[0]!.share
    let taken = fractions[0]!
    if (fractions.length > 1) {
      // Together: add them up one by one.
      for (let k = 1; k < fractions.length; k++) {
        taken = simplify(add(taken, fractions[k]!))
        push({
          op: 'add',
          a: k === 1 ? takes[0]!.share : ref(),
          b: takes[k]!.share,
          label: g === 0 ? `What fraction of ${wholeName} do ${who} take together?` : `What fraction of what was left do ${who} take together?`,
        })
      }
      takenRef = ref()
    }
    if (taken.numerator >= taken.denominator) return null
    const rem = simplify(subtract(ONE, taken))
    push({
      op: 'subtract',
      a: '1',
      b: takenRef,
      label: g === 0 ? `What fraction of ${wholeName} is left after ${who}?` : `What fraction of what was left is still left after ${who}?`,
    })
    shares.push(fractions)
    stillLeft.push(rem)
    stepOfRem.push(steps.length - 1)

    if (g === 0) {
      combinedRef = ref()
      combinedValue = rem
    } else {
      push({ op: 'multiply', a: combinedRef, b: ref(), label: `What fraction of ${wholeName} is left at the end?` })
      combineStep = steps.length - 1
      combinedValue = simplify(multiply(combinedValue, rem))
      combinedRef = ref()
    }
  }

  push({
    op: 'divide',
    a: spec.left.amount.trim(),
    b: combinedRef,
    label: `What was ${wholeName} at the start?`,
  })
  const divideStep = steps.length - 1
  if (steps.length > MAX_PLAN_STEPS) return null

  const totalResult = divide(amount, combinedValue)
  if (!totalResult.ok) return null
  const total = simplify(totalResult.value)

  const plan: Plan = { steps, whole: wholeName, unit: spec }
  const check = resolvePlan(plan)
  if (!check.ok) return null
  // The engine's last answer is the whole; it must be the number worked out above.
  const last = toFraction(check.results.at(-1)!)
  if (last.numerator * total.denominator !== total.numerator * last.denominator) return null

  return { plan, total, stages: unitStages(spec, wholeName, shares, stillLeft, { rem: stepOfRem, combine: combineStep, divide: divideStep }, combinedValue, amount, total) }
}

function unitStages(
  spec: UnitSpec,
  wholeName: string,
  shares: Fraction[][],
  stillLeft: Fraction[],
  stepAt: { rem: number[]; combine: number; divide: number },
  leftOfWhole: Fraction,
  amount: ReturnType<typeof parseMixed> & object,
  total: Fraction,
): BarStage[] | null {
  const leftName = spec.left.name?.trim() || 'left'
  const names = (g: number) => spec.groups[g]!.takes.map((t) => t.name?.trim() || 'a part')

  // Cells for the first group: every share is a whole number of cells.
  const cells0 = shares[0]!.reduce((n, f) => lcm(n, f.denominator), 1)
  // The second group's takes, as fractions of the whole.
  const second = spec.groups.length > 1 ? shares[1]!.map((f) => simplify(multiply(stillLeft[0]!, f))) : []
  const cells = [cells0, ...second.map((f) => f.denominator), leftOfWhole.denominator].reduce((n, d) => lcm(n, d), 1)
  if (cells > MAX_CELLS) return null
  const factor = cells / cells0

  const mark = (start: number, count: number, tone: number, label: string, result: boolean, phase: 1 | 2): BarMark => ({
    start,
    count,
    tone,
    label,
    result,
    phase,
  })

  // Stage 1: the whole cut by the first group's shares; they are taken, the rest remains.
  const takeMarks: BarMark[] = []
  let at = 0
  shares[0]!.forEach((f, i) => {
    const n = (f.numerator * cells0) / f.denominator
    takeMarks.push(mark(at, n, i, names(0)[i]!, false, 1))
    at += n
  })
  const restTone = shares[0]!.length
  const restStart = at
  const restCells0 = cells0 - at
  const firstIsLast = spec.groups.length === 1
  const stage1: BarStage = {
    step: stepAt.rem[0]!,
    before: { cells: cells0, marks: [] },
    after: {
      cells: cells0,
      marks: [...takeMarks, mark(restStart, restCells0, restTone, firstIsLast ? leftName : 'what is left', true, 2)],
    },
    whole: `${wholeName}: ?`,
    caption: `${wholeName} is cut into equal parts. ${joined(names(0))} take${shares[0]!.length === 1 ? 's' : ''} their share. The rest is ${firstIsLast ? leftName : 'what is left'}.`,
  }
  const stages: BarStage[] = [stage1]
  let lastAfter: BarSnapshot = stage1.after
  let leftMark = stage1.after.marks.at(-1)!

  if (!firstIsLast) {
    // The old "what is left" part is now split up, so its name goes; its colour stays under the new marks.
    const base = stage1.after.marks.map((m) => ({
      ...m,
      start: m.start * factor,
      count: m.count * factor,
      label: m.result ? '' : m.label,
      result: false,
    }))
    const restStartN = restStart * factor
    let pos = restStartN
    const secondMarks: BarMark[] = []
    second.forEach((f, i) => {
      const n = (f.numerator * cells) / f.denominator
      secondMarks.push(mark(pos, n, restTone + 1 + i, names(1)[i]!, false, 1))
      pos += n
    })
    const leftCells = cells - pos
    if (leftCells !== (leftOfWhole.numerator * cells) / leftOfWhole.denominator) return null
    leftMark = mark(pos, leftCells, restTone + 1 + second.length, leftName, true, 2)
    const after: BarSnapshot = { cells, marks: [...base, ...secondMarks, leftMark] }
    stages.push({
      step: stepAt.combine,
      before: { cells: cells0, marks: stage1.after.marks },
      after,
      whole: `${wholeName}: ?`,
      caption: `Each part is cut into ${factor} equal parts. ${joined(names(1))} take${second.length === 1 ? 's' : ''} their share of what was left. ${leftName[0]!.toUpperCase()}${leftName.slice(1)} is what remains.`,
    })
    lastAfter = after
  } else if (restCells0 !== (leftOfWhole.numerator * cells0) / leftOfWhole.denominator) {
    return null
  }

  // Stage 3: the units. The left part is worth the amount, so one unit is worth amount ÷ its cells.
  const leftCells = leftMark.count
  const perUnitResult = divide(amount, { numerator: leftCells, denominator: 1 })
  if (!perUnitResult.ok) return null
  const perUnit = formatMixed(toMixed(simplify(perUnitResult.value)))
  const amountText = withUnit(formatMixed(amount), spec.left.unit)
  const totalText = withUnit(formatMixed(toMixed(total)), spec.left.unit)
  const finalMarks: BarMark[] = lastAfter.marks.map((m) =>
    m === leftMark ? { ...m, phase: 1 as const, label: `${leftCells} unit${leftCells === 1 ? '' : 's'} = ${amountText}` } : { ...m, phase: 1 as const },
  )
  finalMarks.push(mark(leftMark.start, 1, leftMark.tone, `1 unit = ${withUnit(perUnit, spec.left.unit)}`, false, 2))
  stages.push({
    step: stepAt.divide,
    before: lastAfter,
    after: { cells, marks: finalMarks },
    whole: `${wholeName} = ${totalText}`,
    caption: `${leftCells} unit${leftCells === 1 ? ' is' : 's are'} ${amountText}, so 1 unit is ${withUnit(perUnit, spec.left.unit)}. All ${cells} units make ${totalText}.`,
  })
  return stages
}
