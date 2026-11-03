import { divide, formatMixed, multiply, parseMixed, simplify, subtract, toFraction, toMixed, type Fraction } from './fraction'
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
  /** Set for margins-and-widths problems: these pictures replace `given` and `stages`. */
  frame?: { given: FrameStage; stages: FrameStage[] }
}

/** One piece of a row with margins: a margin, an object or a gap. Positions are in the row's own units. */
export interface FrameBlock {
  from: number
  to: number
  kind: 'margin' | 'object' | 'gap'
  label: string
}

export interface FrameStage {
  blocks: FrameBlock[]
  /** A bracket over part of the row, with its length in words. */
  braces: Array<{ from: number; to: number; label: string; tone: number }>
  /** What she has worked out so far, one short line each. */
  facts: string[]
  caption: string
}

export function buildSpacingPlan(spec: SpacingSpec): SpacingPlan | null {
  const thing = spec.thing?.trim() || 'mark'
  if (spec.edge !== undefined || spec.size !== undefined) return buildFramePlan(spec, thing)
  if (spec.ask === 'gaps') return buildFitPlan(spec, thing)
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

/** "How many gaps of 7/8 inch fit in 8 3/4 inches?" The question stops at the gaps; the marks are one more. */
function buildFitPlan(spec: SpacingSpec, thing: string): SpacingPlan | null {
  const unit = spec.unit?.trim()
  const gap = parseMixed(spec.gap ?? '')
  const total = parseMixed(spec.far?.distance ?? '')
  if (!gap || !total || toFraction(gap).numerator <= 0 || toFraction(total).numerator <= 0) return null
  const gapLength = simplify(toFraction(gap))
  const fits = divide(simplify(toFraction(total)), gapLength)
  // It must fit a whole number of times; leftovers need a step the engine cannot check.
  if (!fits.ok || simplify(fits.value).denominator !== 1) return null
  const gaps = simplify(fits.value).numerator
  if (gaps < 1 || gaps + 1 > MAX_POSITION) return null

  const steps: PlanStep[] = [
    { op: 'divide', a: spec.far!.distance.trim(), b: spec.gap!.trim(), label: 'How many gaps of that size fit in the whole length?' },
  ]
  const plan: Plan = { steps, spacing: spec }
  const check = resolvePlan(plan)
  if (!check.ok) return null
  const got = toFraction(check.results[0]!)
  if (got.denominator !== 1 || got.numerator !== gaps) return null

  const lengthText = withUnit(formatMixed(toMixed(gapLength)), unit)
  const totalText = withUnit(formatMixed(toMixed(simplify(toFraction(total)))), unit)
  const firstGap: SpacingArc = { from: 1, to: 2, label: `1 gap = ${lengthText}`, side: 'above', tone: 0 }
  const marks = gaps + 1
  const dots: SpacingDot[] =
    marks <= MAX_DOTS
      ? Array.from({ length: marks }, (_, i) => ({ at: i + 1, tone: i === 0 || i === marks - 1 ? (0 as const) : (2 as const) }))
      : [{ at: 1, tone: 0 }, { at: marks, tone: 0 }]
  const given: SpacingStage = {
    dots: [{ at: 1, label: 'start', tone: 0 }],
    arcs: [],
    open: { from: 1, label: totalText },
    caption: `The whole length is ${totalText}, and every gap is ${lengthText}. How many gaps fit?`,
  }
  const stages: SpacingStage[] = [
    {
      dots,
      arcs: [firstGap, { from: 1, to: marks, label: `${gaps} gaps = ${totalText}`, side: 'below', tone: 3 }],
      caption: `${gaps} gaps of ${lengthText} each fill ${totalText}. The dots are the ${pluralOf(thing)}: one more than the gaps.`,
    },
  ]
  const nudges: SpacingNudge[] = [
    { step: 0, wrong: String(marks), message: `That counts the dots. A gap is the space between two ${pluralOf(thing)}: how many hops are there along the line?` },
  ]
  return { plan, gaps, last: marks, facts: [`Whole length: ${totalText}`, `One gap: ${lengthText}`], given, stages, nudges }
}

const num = (f: Fraction) => f.numerator / f.denominator

/**
 * "Three pictures, 2 feet wide each, on a board 10 1/4 feet wide, with a margin of 1/2 foot at each end: how much
 * space between them?" The margins and the object widths come out of the length first, and what is left is shared by
 * the gaps, which are one fewer than the objects. Code builds every step and a picture of the row; the AI only
 * reads the numbers.
 */
function buildFramePlan(spec: SpacingSpec, thing: string): SpacingPlan | null {
  const things = spec.plural?.trim() || pluralOf(thing)
  const unit = spec.unit?.trim()
  const count = wholeNumber(spec.count ?? '')
  const total = parseMixed(spec.total ?? '')
  const edge = spec.edge === undefined ? null : parseMixed(spec.edge)
  const size = spec.size === undefined ? null : parseMixed(spec.size)
  if (count === null || count < 2 || !total || toFraction(total).numerator <= 0) return null
  if (spec.edge !== undefined && (!edge || toFraction(edge).numerator <= 0)) return null
  if (spec.size !== undefined && (!size || toFraction(size).numerator <= 0)) return null

  const gaps = count - 1
  const fmt = (f: Fraction) => withUnit(formatMixed(toMixed(simplify(f))), unit)
  const T = simplify(toFraction(total))
  const E = edge ? simplify(toFraction(edge)) : null
  const S = size ? simplify(toFraction(size)) : null
  const margins = E ? simplify(multiply({ numerator: 2, denominator: 1 }, E)) : null
  const objects = S ? simplify(multiply({ numerator: count, denominator: 1 }, S)) : null

  // The steps, in the order a child would think them. `refOf` remembers which step holds each result.
  const steps: PlanStep[] = []
  const refOf: Record<string, string> = {}
  const push = (key: string, step: PlanStep) => {
    steps.push(step)
    refOf[key] = `r${steps.length}`
  }
  push('gaps', { op: 'subtract', a: String(count), b: '1', label: `How many gaps are there between the ${things}?` })
  if (E) push('margins', { op: 'add', a: spec.edge!.trim(), b: spec.edge!.trim(), label: 'How much space do the two margins take up together?' })
  if (S) push('objects', { op: 'multiply', a: String(count), b: spec.size!.trim(), label: `How wide are all the ${things} together?` })
  let left = spec.total!.trim()
  let leftValue = T
  if (E) {
    push('afterMargins', { op: 'subtract', a: left, b: refOf.margins!, label: 'How much of the length is left after the margins?' })
    left = refOf.afterMargins!
    leftValue = simplify(subtract(leftValue, margins!))
  }
  if (S) {
    push('forGaps', { op: 'subtract', a: left, b: refOf.objects!, label: `How much space is left for the gaps after the ${things}?` })
    left = refOf.forGaps!
    leftValue = simplify(subtract(leftValue, objects!))
  }
  if (toFraction(leftValue).numerator <= 0) return null
  push('gap', { op: 'divide', a: left, b: refOf.gaps!, label: 'How wide is each gap?' })

  const plan: Plan = { steps, spacing: spec }
  const check = resolvePlan(plan)
  if (!check.ok) return null
  const share = divide(leftValue, { numerator: gaps, denominator: 1 })
  if (!share.ok) return null
  const gapValue = simplify(share.value)
  const got = toFraction(check.results.at(-1)!)
  if (got.numerator * gapValue.denominator !== gapValue.numerator * got.denominator) return null

  // The row, drawn to scale from the finished answer; only the labels are held back until a step finds them.
  const e = E ? num(E) : 0
  const s = S ? num(S) : 0
  const g = num(gapValue)
  const length = num(T)
  const build = (labelGap: string, marginLabel: string, objectLabel: string): FrameBlock[] => {
    const blocks: FrameBlock[] = []
    let at = 0
    if (E) blocks.push({ from: 0, to: e, kind: 'margin', label: marginLabel })
    at = e
    for (let i = 0; i < count; i++) {
      blocks.push({ from: at, to: at + s, kind: 'object', label: objectLabel })
      at += s
      if (i < count - 1) {
        blocks.push({ from: at, to: at + g, kind: 'gap', label: labelGap })
        at += g
      }
    }
    if (E) blocks.push({ from: at, to: at + e, kind: 'margin', label: marginLabel })
    return blocks
  }
  const middle = { from: e, to: length - e }
  const totalBrace = { from: 0, to: length, label: fmt(T), tone: 0 }

  const given: FrameStage = {
    blocks: build('?', E ? fmt(E) : '', S ? fmt(S) : ''),
    braces: [totalBrace],
    facts: [],
    caption: `${count} ${things} in a row${E ? ', with a margin at each end' : ''}${S ? `, each ${fmt(S)} wide` : ''}. The whole length is ${fmt(T)}. How wide is each gap between them?`,
  }

  const stages: FrameStage[] = []
  const facts: string[] = []
  let braces = [totalBrace]
  const stageFor = (fact: string, caption: string, gapLabel: string, nextBraces = braces): FrameStage => {
    facts.push(fact)
    braces = nextBraces
    return { blocks: build(gapLabel, E ? fmt(E) : '', S ? fmt(S) : ''), braces, facts: [...facts], caption }
  }
  stages.push(stageFor(`${gaps} gaps`, `${count} ${things} have one fewer gap: count the spaces between them.`, 'gap'))
  if (E) stages.push(stageFor(`Both margins: ${fmt(margins!)}`, `A margin of ${fmt(E)} at each end takes ${fmt(margins!)}.`, 'gap'))
  if (S) stages.push(stageFor(`All the ${things}: ${fmt(objects!)}`, `${count} ${things} of ${fmt(S)} each take ${fmt(objects!)}.`, 'gap'))
  let running = T
  if (E) {
    running = simplify(subtract(running, margins!))
    stages.push(stageFor(`Left after the margins: ${fmt(running)}`, `Take the margins off the length: ${fmt(running)} is left between them.`, 'gap', [totalBrace, { ...middle, label: fmt(running), tone: 1 }]))
  }
  if (S) {
    running = simplify(subtract(running, objects!))
    stages.push(stageFor(`Left for the gaps: ${fmt(running)}`, `Take the ${things} off too: ${fmt(running)} is left to share among the gaps.`, 'gap', [totalBrace, { ...middle, label: `${fmt(running)} for gaps`, tone: 3 }]))
  }
  stages.push(stageFor(`Each gap: ${fmt(gapValue)}`, `${gaps} equal gaps share ${fmt(running)}, so each gap is ${fmt(gapValue)}.`, fmt(gapValue)))

  const nudges: SpacingNudge[] = [
    { step: 0, wrong: String(count), message: `That counts the ${things}. A gap is the space between two ${things}: count the spaces in the picture.` },
  ]
  const lastIndex = steps.length - 1
  const unshared = divide(T, { numerator: gaps, denominator: 1 })
  if (unshared.ok && (E || S)) {
    nudges.push({
      step: lastIndex,
      wrong: formatMixed(toMixed(simplify(unshared.value))),
      message: `That shares the whole length. Look at the picture: the margins${S ? ` and the ${things} themselves` : ''} are not gap space.`,
    })
  }
  return {
    plan,
    gaps,
    last: count,
    facts: [`${count} ${things}${E ? ' with a margin at each end' : ''}`, `Length of the row: ${fmt(T)}`, ...(E ? [`Margin at each end: ${fmt(E)}`] : []), ...(S ? [`Each ${thing} is ${fmt(S)} wide`] : [])],
    given: { dots: [], arcs: [], caption: given.caption },
    stages: [],
    nudges,
    frame: { given, stages },
  }
}
