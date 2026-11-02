import { divide, formatMixed, parseMixed, simplify, toFraction, toMixed, type Fraction } from './fraction'
import { resolvePlan, type Plan, type PlanStep, type SpacingSpec } from './plan'
import { withUnit } from './unitBar'

/**
 * "Things in a row" problems (balloons, trees, poles): the distance between two of them is given, and the child
 * works out how many gaps there are, how long one gap is and which one is last. The classic slip is forgetting that
 * the things and the gaps are different counts, so the number line shows both. Code builds every step, checks it
 * with the fraction engine and draws the line; the AI only reads the shape and the words.
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
  const thing = spec.thing.trim()
  if (!thing) return null
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
