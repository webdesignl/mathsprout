import {
  CHALLENGES,
  ITEMS,
  ITEM_TYPES,
  RULES,
  RULE_GROUPS,
  type AsnAnswer,
  type BarRow,
  type Challenge,
  type BarStart,
  type BarTarget,
  type Item,
  type ItemType,
  type ReverseCheck,
  type Rule,
} from '../data/deepCheck'
import { compare, equals, gcd, isSimplestFraction, isSimplestMixed, parse, parseMixed } from './fraction'

/** A random number in [0, 1), like Math.random. Tests pass a fake one. */
type Random = () => number

export function ruleOf(id: string): Rule | undefined {
  return RULES.find((r) => r.id === id)
}

export function itemsFor(ruleId: string): Item[] {
  return ITEM_TYPES.map((t) => ITEMS.find((i) => i.ruleId === ruleId && i.type === t.type)).filter((i): i is Item => Boolean(i))
}

export function typeLabel(type: ItemType): string {
  return ITEM_TYPES.find((t) => t.type === type)?.label ?? type
}

// ---------------------------------------------------------------------------
// Grading. Code decides every answer; nothing here asks AI.
// ---------------------------------------------------------------------------

export type Grade =
  | { status: 'correct' }
  | { status: 'wrong'; message?: string }
  /** The answer could not be read (not counted); she can fix it and try again. */
  | { status: 'invalid'; message: string }

export function gradeAsn(item: Extract<Item, { type: 'asn' }>, answer: AsnAnswer): Grade {
  return answer === item.answer ? { status: 'correct' } : { status: 'wrong' }
}

export function gradeChoice(item: Extract<Item, { type: 'spotMistake' | 'oddOneOut' }>, index: number): Grade {
  return index === item.answer ? { status: 'correct' } : { status: 'wrong' }
}

const clean = (text: string) => text.trim().replace(/\s+/g, ' ')
const FRACTION_ONLY = /^\d+\/\d+$/
const MIXED_WITH_WHOLE = /^\d+ \d+\/\d+$/
const WHOLE_ONLY = /^\d+$/

/** A fraction, mixed number or whole number from text, or null. Zero bottoms are rejected by the parser. */
function readNumber(text: string) {
  return parse(clean(text))
}

export function gradeReverse(check: ReverseCheck, input: string): Grade {
  const text = clean(input)
  if (!text) return { status: 'invalid', message: 'Type your answer first.' }

  switch (check.kind) {
    case 'fractionEqualsNotSimplest': {
      if (!FRACTION_ONLY.test(text)) return { status: 'invalid', message: 'Type a fraction like 6/8.' }
      const f = readNumber(text)
      const target = readNumber(check.target)!
      if (!f) return { status: 'invalid', message: 'The bottom number cannot be 0.' }
      if (!equals(f, target)) return { status: 'wrong', message: `${text} is not equal to ${check.target}.` }
      if (isSimplestFraction(f)) return { status: 'wrong', message: `${text} is already in simplest form.` }
      return { status: 'correct' }
    }
    case 'mixedEqualsNotSimplest': {
      if (!MIXED_WITH_WHOLE.test(text)) return { status: 'invalid', message: 'Type a mixed number like 1 4/3 (a whole number, a space, then a fraction).' }
      const m = parseMixed(text)
      const target = readNumber(check.target)!
      if (!m) return { status: 'invalid', message: 'The bottom number cannot be 0.' }
      if (!equals(m, target)) return { status: 'wrong', message: `${text} is not equal to ${check.target}.` }
      if (isSimplestMixed(m)) return { status: 'wrong', message: `${text} is already in simplest form.` }
      return { status: 'correct' }
    }
    case 'equalsButDifferent': {
      const n = readNumber(text)
      if (!n) return { status: 'invalid', message: 'Type a number like 2 3/4 or 22/8.' }
      if (!equals(n, readNumber(check.target)!)) return { status: 'wrong', message: `${text} is not equal to ${check.target}.` }
      if (text === clean(check.target)) return { status: 'wrong', message: 'That is the same as the one in the question. Show it a different way.' }
      return { status: 'correct' }
    }
    case 'fractionEqualsWithDen': {
      if (!FRACTION_ONLY.test(text)) return { status: 'invalid', message: 'Type a fraction like 3/6.' }
      const f = readNumber(text)
      if (!f) return { status: 'invalid', message: 'The bottom number cannot be 0.' }
      if (f.denominator !== check.den) return { status: 'wrong', message: `It must have ${check.den} on the bottom.` }
      return equals(f, readNumber(check.target)!) ? { status: 'correct' } : { status: 'wrong', message: `${text} is not equal to ${check.target}.` }
    }
    case 'fractionEquals': {
      const n = readNumber(text)
      if (!n) return { status: 'invalid', message: 'Type a fraction like 3/8.' }
      return equals(n, readNumber(check.target)!) ? { status: 'correct' } : { status: 'wrong' }
    }
    case 'fractionSmallerThan': {
      if (!FRACTION_ONLY.test(text)) return { status: 'invalid', message: 'Type a fraction like 3/8.' }
      const f = readNumber(text)
      if (!f) return { status: 'invalid', message: 'The bottom number cannot be 0.' }
      if (f.denominator !== check.den) return { status: 'wrong', message: `It must have ${check.den} on the bottom.` }
      return f.numerator >= 1 && f.numerator < check.than ? { status: 'correct' } : { status: 'wrong' }
    }
    case 'greaterThan': {
      const n = readNumber(text)
      if (!n) return { status: 'invalid', message: 'Type a number like 6 or 5 1/2.' }
      return compare(n, readNumber(check.target)!) > 0 ? { status: 'correct' } : { status: 'wrong', message: `It must be bigger than ${check.target}.` }
    }
    case 'improperEquals': {
      if (!FRACTION_ONLY.test(text)) return { status: 'invalid', message: 'Type an improper fraction like 13/4 (the top is bigger than the bottom).' }
      const f = readNumber(text)
      if (!f) return { status: 'invalid', message: 'The bottom number cannot be 0.' }
      if (!equals(f, readNumber(check.target)!)) return { status: 'wrong', message: `${text} is not equal to ${check.target}.` }
      return f.numerator >= f.denominator ? { status: 'correct' } : { status: 'wrong', message: 'That is not an improper fraction. The top must not be smaller than the bottom.' }
    }
    case 'properFraction': {
      if (!FRACTION_ONLY.test(text)) return { status: 'invalid', message: 'Type a fraction like 3/5.' }
      const f = readNumber(text)
      if (!f) return { status: 'invalid', message: 'The bottom number cannot be 0.' }
      return f.numerator > 0 && f.numerator < f.denominator
        ? { status: 'correct' }
        : { status: 'wrong', message: 'The fraction must be more than 0 and less than 1, like 3/5.' }
    }
    case 'divisionEquals': {
      const m = /^(\d+) ?(?:÷|:|divided by) ?(\d+)$/i.exec(text)
      if (!m) return { status: 'invalid', message: 'Type a division like 3 ÷ 5, or 3 divided by 5.' }
      const a = Number(m[1])
      const b = Number(m[2])
      if (b === 0) return { status: 'invalid', message: 'You cannot divide by 0.' }
      const g = gcd(a, b) || 1
      const f = { numerator: a / g, denominator: b / g }
      return equals(f, readNumber(check.target)!) ? { status: 'correct' } : { status: 'wrong', message: `${a} ÷ ${b} is not ${check.target}.` }
    }
  }
}

// ---------------------------------------------------------------------------
// The bar builder: whole bars plus pieces of 1/den. Pure rules, so they can be tested.
// ---------------------------------------------------------------------------

export type BarState = BarStart

export type BarAction =
  | { type: 'addPiece' }
  | { type: 'removePiece' }
  | { type: 'addWhole' }
  | { type: 'removeWhole' }
  /** Pieces that fill a bar become one whole bar. */
  | { type: 'regroup' }
  /** One whole bar is cut into pieces. */
  | { type: 'breakWhole' }
  | { type: 'den'; den: number }

export const MAX_WHOLES = 12
export const MAX_PIECES = 60

/** Applies one action. If it is not allowed, the state stays the same and a short reason comes back. */
export function stepBars(state: BarState, action: BarAction, dens: number[]): { state: BarState; message: string } {
  const same = (message: string) => ({ state, message })
  const ok = (next: BarState) => ({ state: next, message: '' })
  switch (action.type) {
    case 'addPiece':
      return state.pieces >= MAX_PIECES ? same('That is enough pieces.') : ok({ ...state, pieces: state.pieces + 1 })
    case 'removePiece':
      return state.pieces <= 0 ? same('There are no pieces to take off.') : ok({ ...state, pieces: state.pieces - 1 })
    case 'addWhole':
      return state.wholes >= MAX_WHOLES ? same('That is enough bars.') : ok({ ...state, wholes: state.wholes + 1 })
    case 'removeWhole':
      return state.wholes <= 0 ? same('There are no whole bars to take off.') : ok({ ...state, wholes: state.wholes - 1 })
    case 'regroup':
      return state.pieces < state.den
        ? same(`You need ${state.den} pieces to fill a bar. You have ${state.pieces}.`)
        : ok({ ...state, pieces: state.pieces - state.den, wholes: state.wholes + 1 })
    case 'breakWhole':
      return state.wholes <= 0
        ? same('There is no whole bar to break.')
        : ok({ ...state, wholes: state.wholes - 1, pieces: state.pieces + state.den })
    case 'den': {
      if (!dens.includes(action.den)) return same('You cannot cut the bar that way.')
      if (action.den === state.den) return ok(state)
      if ((state.pieces * action.den) % state.den !== 0) {
        return same(`${state.pieces}/${state.den} cannot be cut evenly into ${action.den}ths.`)
      }
      const pieces = (state.pieces * action.den) / state.den
      return pieces > MAX_PIECES ? same('That makes too many pieces.') : ok({ ...state, den: action.den, pieces })
    }
  }
}

/** The amount shown, counted in pieces of 1/den. */
export function barTotal(state: BarState): number {
  return state.wholes * state.den + state.pieces
}

export function gradeBars(target: BarTarget, state: BarState): Grade {
  if (state.den !== target.den) return { status: 'wrong', message: `Cut the bar into ${target.den}ths.` }
  if (barTotal(state) !== target.total) return { status: 'wrong', message: 'The bars do not show the right amount yet.' }
  if (target.exact && (state.wholes !== target.exact.wholes || state.pieces !== target.exact.pieces)) {
    return { status: 'wrong', message: 'The amount is right, but the bars are not grouped the way the question asks.' }
  }
  if (target.proper && state.pieces >= state.den) return { status: 'wrong', message: 'The amount is right, but there are still enough pieces to fill another bar. Regroup them.' }
  return { status: 'correct' }
}

/** "3 6/5" for the bars on screen. */
export function barText(state: BarState): string {
  const part = `${state.pieces}/${state.den}`
  if (state.wholes === 0) return state.pieces === 0 ? '0' : part
  return state.pieces === 0 ? String(state.wholes) : `${state.wholes} ${part}`
}

// ---------------------------------------------------------------------------
// Building a quiz
// ---------------------------------------------------------------------------

export const CHAPTER_QUIZ_SIZE = 10

function shuffled<T>(list: T[], rng: Random): T[] {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.min(Math.floor(rng() * (i + 1)), i)
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

export function groupOf(groupId: string) {
  return RULE_GROUPS.find((g) => g.id === groupId)
}

/** The rules in a group, in order. */
export function rulesIn(groupId: string): Rule[] {
  return (groupOf(groupId)?.ruleIds ?? []).map((id) => ruleOf(id)).filter((r): r is Rule => Boolean(r))
}

/** The quiz for a group: one question from every rule in it, then more from random rules, none twice. */
export function buildChapterQuiz(groupId: string = 'addsub', rng: Random = Math.random, size: number = CHAPTER_QUIZ_SIZE): Item[] {
  const ruleIds = groupOf(groupId)?.ruleIds ?? []
  const pool = ITEMS.filter((i) => ruleIds.includes(i.ruleId))
  if (pool.length === 0) return []
  const picked: Item[] = []
  for (const id of ruleIds) {
    const options = pool.filter((i) => i.ruleId === id)
    if (options.length) picked.push(options[Math.min(Math.floor(rng() * options.length), options.length - 1)]!)
  }
  const rest = shuffled(pool.filter((i) => !picked.includes(i)), rng)
  const count = Math.min(Math.max(size, picked.length), pool.length)
  return shuffled([...picked, ...rest].slice(0, count), rng).slice(0, size)
}

// ---------------------------------------------------------------------------
// What she has shown so far (from saved attempts)
// ---------------------------------------------------------------------------

export interface AttemptLine {
  mode: string
  problem: string | null
  correct: boolean
}

/** The text saved for one answered item, like "R2 asn". It carries no name or personal detail. */
export function attemptText(item: Pick<Item, 'ruleId' | 'type'>): string {
  return `${item.ruleId} ${item.type}`
}

export interface RuleProgress {
  /** How many of the five question types she has answered right at least once. */
  stars: number
  tried: number
  right: number
}

export const MASTERED_STARS = ITEM_TYPES.length

export function deepCheckProgress(lines: AttemptLine[]): Record<string, RuleProgress> {
  const result: Record<string, RuleProgress> = {}
  const rightTypes = new Map<string, Set<string>>()
  for (const rule of RULES) result[rule.id] = { stars: 0, tried: 0, right: 0 }
  for (const line of lines) {
    if (line.mode !== 'deep_check' || !line.problem) continue
    const [ruleId, type] = line.problem.split(' ')
    const entry = ruleId ? result[ruleId] : undefined
    if (!entry || !type) continue
    entry.tried += 1
    if (line.correct) {
      entry.right += 1
      rightTypes.set(ruleId!, (rightTypes.get(ruleId!) ?? new Set()).add(type))
    }
  }
  for (const [ruleId, types] of rightTypes) result[ruleId]!.stars = types.size
  return result
}

// ---------------------------------------------------------------------------
// Pictures
// ---------------------------------------------------------------------------

export interface DrawnBar {
  /** How many of the `den` pieces are shaded. */
  shaded: number
  den: number
  /** Whole bars are green; the leftover pieces are amber. */
  kind: 'whole' | 'extra'
}

/** The bars to draw for a row: whole bars first, then bars for the extra pieces (at least one bar). */
export function barsFor(row: BarRow): DrawnBar[] {
  const bars: DrawnBar[] = []
  for (let i = 0; i < (row.wholes ?? 0); i++) bars.push({ shaded: row.den, den: row.den, kind: 'whole' })
  let left = row.extra
  do {
    const shaded = Math.min(left, row.den)
    bars.push({ shaded, den: row.den, kind: 'extra' })
    left -= row.den
  } while (left > 0)
  return bars
}

// ---------------------------------------------------------------------------
// Olympiad challenges
// ---------------------------------------------------------------------------

export function challengeOf(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id)
}

export function challengesIn(groupId: string): Challenge[] {
  return CHALLENGES.filter((c) => c.groupId === groupId)
}

export type FieldGrade = { status: 'correct' } | { status: 'wrong'; message?: string } | { status: 'invalid'; message: string }

export interface ChallengeGrade {
  fields: Record<string, FieldGrade>
  /** Every field was read; the answer can be counted. */
  readable: boolean
  correct: boolean
}

/** Checks each field of a challenge. A field that cannot be read is not counted as wrong; she can fix it. */
export function gradeChallenge(challenge: Challenge, values: Record<string, string | number | null | undefined>): ChallengeGrade {
  const fields: Record<string, FieldGrade> = {}
  for (const field of challenge.fields) {
    const raw = values[field.id]
    if (field.kind === 'choice') {
      fields[field.id] =
        typeof raw !== 'number' ? { status: 'invalid', message: 'Pick one.' } : raw === field.answer ? { status: 'correct' } : { status: 'wrong' }
      continue
    }
    const text = clean(String(raw ?? ''))
    if (!text) {
      fields[field.id] = { status: 'invalid', message: 'Type your answer.' }
      continue
    }
    const value = readNumber(text)
    if (!value) {
      fields[field.id] = { status: 'invalid', message: 'Type a number or a fraction, like 3/10 or 7 7/8.' }
      continue
    }
    if (!equals(value, readNumber(field.answer)!)) {
      fields[field.id] = { status: 'wrong' }
    } else if (field.simplest && !(FRACTION_ONLY.test(text) && isSimplestFraction(value)) && !WHOLE_ONLY.test(text)) {
      fields[field.id] = { status: 'wrong', message: 'The value is right. Write it in simplest form.' }
    } else {
      fields[field.id] = { status: 'correct' }
    }
  }
  const all = Object.values(fields)
  return {
    fields,
    readable: all.every((f) => f.status !== 'invalid'),
    correct: all.every((f) => f.status === 'correct'),
  }
}

/** The text saved for an answered challenge, like "C2 challenge". */
export function challengeAttemptText(challenge: Pick<Challenge, 'id'>): string {
  return `${challenge.id} challenge`
}

/** The challenges she has solved at least once. */
export function challengesSolved(lines: AttemptLine[]): Set<string> {
  const solved = new Set<string>()
  for (const line of lines) {
    if (line.mode !== 'deep_check' || !line.correct || !line.problem) continue
    const [id, kind] = line.problem.split(' ')
    if (id && kind === 'challenge' && challengeOf(id)) solved.add(id)
  }
  return solved
}
