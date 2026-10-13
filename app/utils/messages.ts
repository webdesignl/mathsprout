import type { Op, Slip, StepKind } from './fraction'

/** A function returning a number in [0, 1), like Math.random. */
type Random = () => number

/** Short, varied success lines. Kept small so praise never feels repeated or over the top. */
export const SUCCESS_MESSAGES = ['Yes!', 'Nice one.', 'That’s right.', 'You got it.', 'Spot on.']

export const WRONG_MESSAGES = ['Not quite.', 'Not yet.', 'Hmm, not that one.']

/**
 * Shown when her proof has a slip. The slip is in the check, not in her answer, so these keep her going.
 * Each is short, and the same one never shows twice in a row.
 */
export const PROOF_SLIP_MESSAGES = [
  'Your answer holds up. Check this step again, you’re close!',
  'The slip is in the proof, not your answer. Keep going!',
  'So close! The mistake is in this check, not the problem.',
  'Don’t give up! Your answer is fine, try the check again.',
]

export const NOT_SIMPLEST_MESSAGE = 'Equal, but can you write it in simplest form?'

/** Why we prove answers. Shown only when she taps "Why prove it?". */
export const WHY_PROVE_IT =
  'Check with the opposite operation, like checking 6 × 7 = 42 with 42 ÷ 7 = 6. If you get back to where you started, your answer is right.'

/** Picks any item except `last`, so the same line never shows twice in a row. */
export function pickDifferent(list: string[], last: string | null, rng: Random = Math.random): string {
  const options = list.filter((item) => item !== last)
  const pool = options.length > 0 ? options : list
  return pool[Math.min(Math.floor(rng() * pool.length), pool.length - 1)]!
}

/** One short question aimed at the step where the slip happened (never the answer). */
export const STEP_HINTS: Record<StepKind, string> = {
  rename: 'What bottom number can both fractions share?',
  regroup: 'Do you need to borrow a whole here?',
  addWholes: 'Try adding the whole numbers again?',
  subtractWholes: 'Try subtracting the whole numbers again?',
  addNumerators: 'Try adding the top numbers again?',
  subtractNumerators: 'Try subtracting the top numbers again?',
  simplify: 'Can the top and bottom shrink together?',
  toMixed: 'Is there a whole hiding in the fraction?',
  negative: 'Which number should come first?',
  answer: 'Put the whole and fraction together. What do you get?',
}

/** A second hint for slips that happen before any step (so there is no step to point at). */
export const SLIP_NUDGES: Partial<Record<Slip, string>> = {
  wrongOperation: 'Words like “in all” add. Words like “left” subtract.',
}

export const GENERIC_STEP_HINT = 'Go one step at a time. What comes first?'

/** A hint for the proof step, aimed at the opposite operation. */
export function proofHint(op: Op, other: string): string {
  return op === 'subtract'
    ? `To undo subtracting, add ${other} back. What do you get?`
    : `To undo adding, take ${other} away. What do you get?`
}

/** Kind names for slips, used in the Learn panel. */
export function slipName(slip: Slip, op: Op): string | null {
  switch (slip) {
    case 'numeratorArithmetic':
      return op === 'add' ? 'an adding slip' : 'a subtracting slip'
    case 'wholeArithmetic':
      return 'a whole-number slip'
    case 'forgotRegroup':
      return 'a borrowing slip'
    case 'addedDenominators':
      return 'adding the bottom numbers'
    case 'noCommonDenominator':
      return 'bottoms that didn’t match yet'
    case 'notSimplified':
      return 'a not-simplest slip'
    case 'wrongOperation':
      return 'using the other operation'
    default:
      return null
  }
}
