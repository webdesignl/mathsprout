import { divide, formatMixed, multiply, parseMixed, simplify, toFraction, toMixed, type Fraction } from './fraction'
import { resolvePlan, type Plan, type PlanStep, type SpacingSpec } from './plan'
import { withUnit } from './unitBar'

/**
 * Spacing problems: marks at equal gaps along a line (balloons, trees, poles, stairs; the word does not matter).
 * The core is that marks and gaps are different counts (marks = gaps + 1) and distance = gaps x one gap. The number
 * line shows both, because forgetting the difference is the classic slip. Code builds every step, checks it with
 * the fraction engine and draws the line; the AI only reads the shape and a word for the mark.
 */
const MAX_POSITION = 99
/** Past this many positions the line shows only the named ones, not every tick. */
export const MAX_DOTS = 30

const wholeNumber = (text: string): number | null => {
  const n = Number(text.trim())
  return Number.isInteger(n) && n >= 1 && n <= MAX_POSITION ? n : null
}

export function ordinal(n: number): string {
  const tens = n % 100
  const suffix = tens >= 11 && tens <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
  return `${n}${suffix}`
}

export function pluralOf(thing: string): string {
  if (/(s|x|ch|sh)$/i.test(thing)) return `${thing}es`
  if (/[^aeiou]y$/i.test(thing)) return `${thing.slice(0, -1)}ies`
  return `${thing}s`
}

export interface SpacingDot {
  at: number
  label?: string
  /** 0 is a thing from the problem, 1 the last one, 2 an unnamed thing in between. */
  tone: 0 | 1 | 2
}

export interface SpacingArc {
  from: number
  to: number
  label: string
  side: 'above' | 'below'
  tone: number
}

export interface SpacingStage {
  dots: SpacingDot[]
  arcs: SpacingArc[]
  /** Counting starts here and the end is not known yet, so the picture draws a dashed arrow ending in "?". */
  open?: { from: number; label: string }
  caption: string
}

/** A common slip, and a nudge that makes her look at the picture. A nudge never contains the answer. */
export interface SpacingNudge {
  step: number
  wrong: string
  message: string
}

export interface SpacingPlan {
  plan: Plan
  /** Number of gaps from the starting thing to the last one, and the number of the last one. */
  gaps: number
  last: number
  /** "What is given", in short lines taken from the problem. */
  facts: string[]
  given: SpacingStage
  /** The picture after each step has been answered. */
  stages: SpacingStage[]
  nudges: SpacingNudge[]
}

export function buildSpacingPlan(spec: SpacingSpec): SpacingPlan | null {
  const thing = spec.thing?.trim() || 'mark'
  if (spec.count !== undefined) return spec.total !== undefined ? buildGapPlan(spec, thing) : buildDistancePlan(spec, thing)
  if (!spec.far) return null
  const things = spec.plural?.trim() || pluralOf(thing)
  const unit = spec.unit?.trim()
  const start = wholeNumber(spec.far.from)
  const farDistance = parseMixed(spec.far.distance)
  if (start === null || !farDistance || toFraction(farDistance).numerator <= 0) return null

  // How long one gap is, and the steps that find it.
  let gapLength: Fraction
  const steps: PlanStep[] = []
  let a = 0
  let b = 0
  let nearGaps = 0
  if (spec.near) {
    const from = wholeNumber(spec.near.from)
    const to = wholeNumber(spec.near.to)
    const distance = parseMixed(spec.near.distance)
    if (from === null || to === null || from >= to || !distance || toFraction(distance).numerator <= 0) return null
    a = from
    b = to
    nearGaps = to - from
    const length = divide(toFraction(distance), { numerator: nearGaps, denominator: 1 })
    if (!length.ok) return null
    gapLength = simplify(length.value)
    steps.push(
      { op: 'subtract', a: String(to), b: String(from), label: `How many gaps are there between the ${ordinal(from)} and the ${ordinal(to)} ${thing}?` },
      { op: 'divide', a: spec.near.distance.trim(), b: 'r1', label: 'How long is one gap?' },
    )
  } else {
    const gap = parseMixed(spec.gap ?? '')
    if (!gap || toFraction(gap).numerator <= 0) return null
    gapLength = simplify(toFraction(gap))
  }

  const gapsRef = spec.near ? 'r2' : spec.gap!.trim()
  const farGaps = divide(toFraction(farDistance), gapLength)
  if (!farGaps.ok) return null
  const gapCount = simplify(farGaps.value)
  // The gaps must fit a whole number of times, or the problem has no answer in things.
  if (gapCount.denominator !== 1 || gapCount.numerator < 1) return null
  const gaps = gapCount.numerator
  const last = start + gaps
  if (last > MAX_POSITION) return null

  const gapsStep = steps.length
  steps.push({
    op: 'divide',
    a: spec.far.distance.trim(),
    b: gapsRef,
    label: `How many gaps are there from the ${ordinal(start)} ${thing} to the last one?`,
  })
  const lastStep = steps.length
  steps.push({
    op: 'add',
    a: String(start),
    b: `r${gapsStep + 1}`,
    label: start === 1 ? `How many ${things} are there in all?` : `Which number ${thing} is the last one?`,
  })

  const plan: Plan = { steps, spacing: spec }
  const check = resolvePlan(plan)
  if (!check.ok) return null
  const got = toFraction(check.results.at(-1)!)
  if (got.denominator !== 1 || got.numerator !== last) return null

  const lengthText = withUnit(formatMixed(toMixed(gapLength)), unit)
  const farText = withUnit(formatMixed(toMixed(simplify(toFraction(farDistance)))), unit)
  const startName = `${ordinal(start)} ${thing}`
  const lastName = `${ordinal(last)} ${thing}`

  const startDot: SpacingDot = { at: start, label: start === 1 ? undefined : ordinal(start), tone: 0 }
  const nearDots: SpacingDot[] = spec.near
    ? [
        { at: a, label: ordinal(a), tone: 0 },
        { at: b, label: ordinal(b), tone: 0 },
      ]
    : []
  const base = [...nearDots, ...(nearDots.some((d) => d.at === start) ? [] : [startDot])].sort((p, q) => p.at - q.at)
  const nearText = spec.near ? withUnit(formatMixed(toMixed(simplify(toFraction(parseMixed(spec.near.distance)!)))), unit) : ''
  const nearArc = (label: string): SpacingArc[] => (spec.near ? [{ from: a, to: b, label, side: 'above', tone: 0 }] : [])
  const between = (): SpacingDot[] =>
    spec.near && nearGaps <= 8 ? Array.from({ length: nearGaps - 1 }, (_, i) => ({ at: a + 1 + i, tone: 2 as const })) : []

  const given: SpacingStage = {
    dots: base,
    arcs: nearArc(nearText),
    open: { from: start, label: farText },
    caption: spec.near
      ? `The ${ordinal(a)} and ${ordinal(b)} ${thing} are ${nearText} apart. From the ${startName} to the last one is ${farText}.`
      : `Every gap is ${lengthText}. From the ${startName} to the last one is ${farText}.`,
  }

  const stages: SpacingStage[] = []
  if (spec.near) {
    stages.push({
      dots: [...base, ...between()].sort((p, q) => p.at - q.at),
      arcs: nearArc(`${nearGaps} gaps = ${nearText}`),
      open: given.open,
      caption: `Count the gaps, the spaces between the ${things}, not the ${things} themselves.`,
    })
    stages.push({
      dots: [...base, ...between()].sort((p, q) => p.at - q.at),
      arcs: [...nearArc(`${nearGaps} gaps = ${nearText}`), { from: a, to: a + 1, label: `1 gap = ${lengthText}`, side: 'below', tone: 1 }],
      open: given.open,
      caption: `${nearGaps} equal gaps share ${nearText}, so each gap is ${lengthText}.`,
    })
  }
  const openAfterGaps = { from: start, label: `${gaps} gaps = ${farText}` }
  stages.push({
    dots: base,
    arcs: nearArc(spec.near ? `${nearGaps} gaps = ${nearText}` : ''),
    open: openAfterGaps,
    caption: `Each gap is ${lengthText}, so ${farText} holds ${gaps} gaps. Where does the last ${thing} end up?`,
  })
  const all: SpacingDot[] =
    last <= MAX_DOTS
      ? Array.from({ length: last }, (_, i) => ({ at: i + 1, tone: 2 as const }))
      : []
  const named = new Map<number, SpacingDot>()
  for (const d of [...all, ...base, { at: last, label: `${ordinal(last)} (last)`, tone: 1 as const }]) named.set(d.at, d)
  stages.push({
    dots: [...named.values()].sort((p, q) => p.at - q.at),
    arcs: [...nearArc(spec.near ? `${nearGaps} gaps = ${nearText}` : ''), { from: start, to: last, label: `${gaps} gaps = ${farText}`, side: 'below', tone: 3 }],
    caption:
      start === 1
        ? `${gaps} gaps start from the 1st ${thing}, and the 1st ${thing} has no gap before it, so there are ${gaps} + 1 = ${last} ${things}.`
        : `The ${startName} is where the ${gaps} gaps start, so the last one is ${start} + ${gaps} = ${last}: the ${lastName}.`,
  })

  const nudges: SpacingNudge[] = []
  if (spec.near) {
    nudges.push({
      step: 0,
      wrong: String(nearGaps + 1),
      message: `Look at the line: a gap is the space between two ${things}. Touch the ${ordinal(a)} ${thing}, then hop to the next one, and count the hops.`,
    })
  }
  nudges.push({
    step: lastStep,
    wrong: String(gaps),
    message: `Those are the gaps. Does the picture show a ${thing} at the end of the last gap, and one at the start of the first? Count the ${things}, not only the gaps.`,
  })
  if (start !== 1) {
    nudges.push({
      step: lastStep,
      wrong: String(gaps + 1),
      message: `That would be right if the gaps started at the 1st ${thing}. Where do these gaps start?`,
    })
  }

  const facts = [
    spec.near ? `The ${ordinal(a)} ${thing} to the ${ordinal(b)} ${thing}: ${nearText}` : `One gap is ${lengthText}`,
    `The ${startName} to the last ${thing}: ${farText}`,
    `The ${things} are spread evenly`,
  ]

  return { plan, gaps, last, facts, given, stages, nudges }
}

/** "There are 12 trees, 2 1/2 m apart. How long is the road from the first to the last?" Marks minus one is the gaps. */
function buildDistancePlan(spec: SpacingSpec, thing: string): SpacingPlan | null {
  const things = spec.plural?.trim() || pluralOf(thing)
  const unit = spec.unit?.trim()
  const count = wholeNumber(spec.count ?? '')
  const gap = parseMixed(spec.gap ?? '')
  if (count === null || count < 2 || !gap || toFraction(gap).numerator <= 0) return null
  const gaps = count - 1
  const gapLength = simplify(toFraction(gap))
  const steps: PlanStep[] = [
    { op: 'subtract', a: String(count), b: '1', label: `How many gaps are there between the ${things}?` },
    { op: 'multiply', a: 'r1', b: spec.gap!.trim(), label: `How far is it from the first ${thing} to the last one?` },
  ]
  const plan: Plan = { steps, spacing: spec }
  const check = resolvePlan(plan)
  if (!check.ok) return null
  const total = simplify(multiply({ numerator: gaps, denominator: 1 }, gapLength))
  const got = toFraction(check.results.at(-1)!)
  if (got.numerator * total.denominator !== total.numerator * got.denominator) return null

  const lengthText = withUnit(formatMixed(toMixed(gapLength)), unit)
  const totalText = withUnit(formatMixed(toMixed(total)), unit)
  const wrongTotal = simplify(multiply({ numerator: count, denominator: 1 }, gapLength))
  const dots = (): SpacingDot[] => {
    const all = count <= MAX_DOTS ? Array.from({ length: count }, (_, i) => ({ at: i + 1, tone: 2 as const })) : []
    const named = new Map<number, SpacingDot>()
    for (const d of [...all, { at: 1, label: '1st', tone: 0 as const }, { at: count, label: `${ordinal(count)} (last)`, tone: 0 as const }]) named.set(d.at, d)
    return [...named.values()].sort((p, q) => p.at - q.at)
  }
  const firstGap: SpacingArc = { from: 1, to: 2, label: `1 gap = ${lengthText}`, side: 'above', tone: 0 }
  const given: SpacingStage = {
    dots: dots(),
    arcs: [firstGap],
    caption: `There are ${count} ${things} in a row. Each gap is ${lengthText}. How far is it from the first to the last?`,
  }
  const stages: SpacingStage[] = [
    {
      dots: dots(),
      arcs: [firstGap, { from: 1, to: count, label: `${gaps} gaps`, side: 'below', tone: 1 }],
      caption: `${count} ${things} have one fewer gap: the first ${thing} has no gap before it.`,
    },
    {
      dots: dots(),
      arcs: [firstGap, { from: 1, to: count, label: `${gaps} gaps = ${totalText}`, side: 'below', tone: 3 }],
      caption: `${gaps} gaps of ${lengthText} each make ${totalText} from the first ${thing} to the last.`,
    },
  ]
  const nudges: SpacingNudge[] = [
    { step: 0, wrong: String(count), message: `That counts the ${things}. A gap is the space between two ${things}: hop along the line and count the hops.` },
    {
      step: 1,
      wrong: formatMixed(toMixed(wrongTotal)),
      message: `That treats every ${thing} as a gap. Look at the line: how many gaps are there between the first and the last ${thing}?`,
    },
  ]
  return { plan, gaps, last: count, facts: [`${count} ${things} in a row`, `One gap is ${lengthText}`, `The ${things} are spread evenly`], given, stages, nudges }
}

/** "A board 5 1/4 feet long has 5 posts, one at each end. How far apart are two posts?" Gaps are one fewer than marks. */
function buildGapPlan(spec: SpacingSpec, thing: string): SpacingPlan | null {
  const things = spec.plural?.trim() || pluralOf(thing)
  const unit = spec.unit?.trim()
  const count = wholeNumber(spec.count ?? '')
  const total = parseMixed(spec.total ?? '')
  if (count === null || count < 2 || !total || toFraction(total).numerator <= 0) return null
  const gaps = count - 1
  const steps: PlanStep[] = [
    { op: 'subtract', a: String(count), b: '1', label: `How many gaps are there between the ${things}?` },
    { op: 'divide', a: spec.total!.trim(), b: 'r1', label: `How far apart are two ${things} next to each other?` },
  ]
  const plan: Plan = { steps, spacing: spec }
  const check = resolvePlan(plan)
  if (!check.ok) return null
  const totalFraction = simplify(toFraction(total))
  const each = divide(totalFraction, { numerator: gaps, denominator: 1 })
  if (!each.ok) return null
  const eachFraction = simplify(each.value)
  const got = toFraction(check.results.at(-1)!)
  if (got.numerator * eachFraction.denominator !== eachFraction.numerator * got.denominator) return null

  const totalText = withUnit(formatMixed(toMixed(totalFraction)), unit)
  const eachText = withUnit(formatMixed(toMixed(eachFraction)), unit)
  const wrong = divide(totalFraction, { numerator: count, denominator: 1 })
  const dots = (): SpacingDot[] => {
    const all = count <= MAX_DOTS ? Array.from({ length: count }, (_, i) => ({ at: i + 1, tone: 2 as const })) : []
    const named = new Map<number, SpacingDot>()
    for (const d of [...all, { at: 1, label: 'first', tone: 0 as const }, { at: count, label: 'last', tone: 0 as const }]) named.set(d.at, d)
    return [...named.values()].sort((p, q) => p.at - q.at)
  }
  const whole: SpacingArc = { from: 1, to: count, label: totalText, side: 'below', tone: 0 }
  const given: SpacingStage = {
    dots: dots(),
    arcs: [whole, { from: 1, to: 2, label: '1 gap = ?', side: 'above', tone: 3 }],
    caption: `${count} ${things} stand in a row, the first at the start and the last at the end. The row is ${totalText} long. How far apart are two ${things} next to each other?`,
  }
  const stages: SpacingStage[] = [
    {
      dots: dots(),
      arcs: [whole, { from: 1, to: count, label: `${gaps} gaps`, side: 'above', tone: 1 }],
      caption: `Count the spaces between the ${things}, not the ${things}: the first ${thing} has no gap before it.`,
    },
    {
      dots: dots(),
      arcs: [whole, { from: 1, to: 2, label: `1 gap = ${eachText}`, side: 'above', tone: 3 }],
      caption: `${gaps} equal gaps share ${totalText}, so each gap is ${eachText}.`,
    },
  ]
  const nudges: SpacingNudge[] = [
    { step: 0, wrong: String(count), message: `That counts the ${things}. A gap is the space between two ${things}: hop along the line and count the hops.` },
  ]
  if (wrong.ok) {
    nudges.push({
      step: 1,
      wrong: formatMixed(toMixed(simplify(wrong.value))),
      message: `That shares the length between every ${thing}, but the length is shared by the gaps. How many gaps are there on the line?`,
    })
  }
  return { plan, gaps, last: count, facts: [`${count} ${things} in a row, one at each end`, `Length from the first to the last: ${totalText}`, `The ${things} are spread evenly`], given, stages, nudges }
}
