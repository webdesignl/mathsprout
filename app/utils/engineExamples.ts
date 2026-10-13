import type { AnyOp } from './fraction'

/** A ready-made case for the engine playground. `expected` is checked by a test, so the buttons never lie. */
export interface EngineExample {
  label: string
  op: AnyOp
  a: string
  b: string
  /** The answer in simplest form, or "error" when it can't be answered. */
  expected: string
  /** A wrong answer worth trying, and the slip it should be diagnosed as. */
  student?: { text: string; slip: string }
}

export const ADD_SUBTRACT_EXAMPLES: EngineExample[] = [
  { label: '4 1/3 + 2 5/12', op: 'add', a: '4 1/3', b: '2 5/12', expected: '6 3/4' },
  { label: '4 3/5 − 1 1/2', op: 'subtract', a: '4 3/5', b: '1 1/2', expected: '3 1/10' },
  { label: '3/4 + 8 2/5', op: 'add', a: '3/4', b: '8 2/5', expected: '9 3/20' },
  { label: '1 2/5 + 1/6', op: 'add', a: '1 2/5', b: '1/6', expected: '1 17/30' },
  { label: '5 1/3 + 2 3/5', op: 'add', a: '5 1/3', b: '2 3/5', expected: '7 14/15' },
  { label: '7 14/15 − 7 1/5', op: 'subtract', a: '7 14/15', b: '7 1/5', expected: '11/15' },
  {
    label: '8 1/5 − 4 3/4',
    op: 'subtract',
    a: '8 1/5',
    b: '4 3/4',
    expected: '3 9/20',
    student: { text: '3 11/20', slip: 'numeratorArithmetic' },
  },
  { label: '9 − 3 5/6', op: 'subtract', a: '9', b: '3 5/6', expected: '5 1/6' },
  { label: '6 1/2 − 1 1/4', op: 'subtract', a: '6 1/2', b: '1 1/4', expected: '5 1/4' },
  {
    label: '1/5 + 3/4',
    op: 'add',
    a: '1/5',
    b: '3/4',
    expected: '19/20',
    student: { text: '4/9', slip: 'addedDenominators' },
  },
]

export const MULTIPLY_DIVIDE_EXAMPLES: EngineExample[] = [
  { label: '2/3 × 3/4', op: 'multiply', a: '2/3', b: '3/4', expected: '1/2' },
  { label: '3/5 × 10', op: 'multiply', a: '3/5', b: '10', expected: '6' },
  { label: '4/9 × 3/8', op: 'multiply', a: '4/9', b: '3/8', expected: '1/6' },
  {
    label: '1 3/4 × 2',
    op: 'multiply',
    a: '1 3/4',
    b: '2',
    expected: '3 1/2',
    student: { text: '2 3/4', slip: 'forgotToConvertMixed' },
  },
  {
    label: '2 1/2 × 3 1/3',
    op: 'multiply',
    a: '2 1/2',
    b: '3 1/3',
    expected: '8 1/3',
    student: { text: '6 1/6', slip: 'multipliedPartsSeparately' },
  },
  { label: '3/4 ÷ 3', op: 'divide', a: '3/4', b: '3', expected: '1/4' },
  { label: '6 ÷ 2/3', op: 'divide', a: '6', b: '2/3', expected: '9' },
  { label: '5 ÷ 8', op: 'divide', a: '5', b: '8', expected: '5/8' },
  {
    label: '2/3 ÷ 4/9',
    op: 'divide',
    a: '2/3',
    b: '4/9',
    expected: '1 1/2',
    student: { text: '8/27', slip: 'forgotReciprocal' },
  },
  {
    label: '2/3 ÷ 4/9 (flipped the first)',
    op: 'divide',
    a: '2/3',
    b: '4/9',
    expected: '1 1/2',
    student: { text: '2/3', slip: 'flippedWrongFraction' },
  },
  { label: '2 1/4 ÷ 1 1/2', op: 'divide', a: '2 1/4', b: '1 1/2', expected: '1 1/2' },
  { label: '6 × 1/2 = 12 (size)', op: 'multiply', a: '6', b: '1/2', expected: '3', student: { text: '12', slip: 'unknown' } },
  { label: '6 ÷ 1/2 = 3 (size)', op: 'divide', a: '6', b: '1/2', expected: '12', student: { text: '3', slip: 'unknown' } },
  { label: '3/5 ÷ 0', op: 'divide', a: '3/5', b: '0', expected: 'error' },
  { label: '3/5 ÷ 0/4', op: 'divide', a: '3/5', b: '0/4', expected: 'error' },
]

export const ENGINE_EXAMPLES: EngineExample[] = [...ADD_SUBTRACT_EXAMPLES, ...MULTIPLY_DIVIDE_EXAMPLES]
