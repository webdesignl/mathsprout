import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  add,
  compare,
  diagnose,
  divide,
  divideSteps,
  equals,
  estimateCheck,
  formatMixed,
  gcd,
  isSimplestMixed,
  isZero,
  multiply,
  multiplySteps,
  reciprocal,
  sizeCheck,
  toMixed,
  verifyByInverse,
  workedSteps,
  type DivideResult,
  type Fraction,
  type MixedNumber,
  type MulProblem,
  type Operand,
} from '../app/utils/fraction'
import { slipName } from '../app/utils/messages'

const f = (numerator: number, denominator: number): Fraction => ({ numerator, denominator })
const m = (whole: number, num: number, den: number): MixedNumber => ({ whole, num, den })
const whole = (n: number): Fraction => f(n, 1)
const text = (x: Operand) => formatMixed(x)
const value = (r: DivideResult): Fraction => {
  if (!r.ok) throw new Error('expected a value')
  return r.value
}
const mulProblem = (op: MulProblem['op'], a: Operand, b: Operand): MulProblem => ({ op, a, b })
const words = (s: string) => s.trim().split(/\s+/).length

describe('multiply', () => {
  it('2/3 x 3/4 = 1/2', () => expect(text(multiply(f(2, 3), f(3, 4)))).toBe('1/2'))
  it('3/5 x 10 = 6', () => {
    expect(text(multiply(f(3, 5), whole(10)))).toBe('6')
    expect(text(multiply(f(3, 5), m(10, 0, 1)))).toBe('6')
  })
  it('4/9 x 3/8 = 1/6', () => expect(text(multiply(f(4, 9), f(3, 8)))).toBe('1/6'))
  it('1 3/4 x 2 = 3 1/2', () => expect(text(multiply(m(1, 3, 4), whole(2)))).toBe('3 1/2'))
  it('2 1/2 x 3 1/3 = 8 1/3', () => expect(text(multiply(m(2, 1, 2), m(3, 1, 3)))).toBe('8 1/3'))
  it('handles zero and one', () => {
    expect(text(multiply(f(0, 5), f(3, 4)))).toBe('0')
    expect(text(multiply(f(7, 3), whole(1)))).toBe('2 1/3')
  })
  it('always returns a simplified fraction with a positive denominator, even from unreduced input', () => {
    expect(multiply(f(6, 8), f(2, 3))).toEqual({ numerator: 1, denominator: 2 })
    expect(multiply(f(-1, 2), f(1, 3))).toEqual({ numerator: -1, denominator: 6 })
  })
})

describe('reciprocal', () => {
  it('flips fractions, mixed numbers and whole numbers', () => {
    expect(value(reciprocal(f(3, 4)))).toEqual(f(4, 3))
    expect(value(reciprocal(m(1, 1, 2)))).toEqual(f(2, 3))
    expect(value(reciprocal(whole(5)))).toEqual(f(1, 5))
    expect(value(reciprocal(f(6, 4)))).toEqual(f(2, 3))
  })
  it('keeps the denominator positive for a negative number', () => {
    expect(value(reciprocal(f(-3, 4)))).toEqual(f(-4, 3))
  })
  it('zero has no reciprocal: an error result, no throw', () => {
    for (const zero of [whole(0), f(0, 4), m(0, 0, 1), m(0, 0, 5)]) {
      expect(reciprocal(zero)).toMatchObject({ ok: false, error: 'divisionByZero' })
    }
  })
})

describe('divide', () => {
  it('3/4 ÷ 3 = 1/4', () => expect(text(value(divide(f(3, 4), whole(3))))).toBe('1/4'))
  it('6 ÷ 2/3 = 9', () => expect(text(value(divide(whole(6), f(2, 3))))).toBe('9'))
  it('5 ÷ 8 = 5/8', () => expect(text(value(divide(whole(5), whole(8))))).toBe('5/8'))
  it('2/3 ÷ 4/9 = 1 1/2', () => expect(text(value(divide(f(2, 3), f(4, 9))))).toBe('1 1/2'))
  it('2 1/4 ÷ 1 1/2 = 1 1/2', () => expect(text(value(divide(m(2, 1, 4), m(1, 1, 2))))).toBe('1 1/2'))
  it('0 ÷ a number is 0', () => expect(text(value(divide(whole(0), f(3, 4))))).toBe('0'))

  it('3/5 ÷ 0 and 3/5 ÷ 0/4 return an error result, never throw, never Infinity', () => {
    for (const zero of [whole(0), f(0, 4), m(0, 0, 3)]) {
      const result = divide(f(3, 5), zero)
      expect(result).toMatchObject({ ok: false, error: 'divisionByZero' })
      expect(result.ok === false && result.message).toMatch(/divide by zero/)
      expect(() => divide(f(3, 5), zero)).not.toThrow()
    }
  })

  it('does not let a zero divisor slip through any engine function', () => {
    const problem = mulProblem('divide', f(3, 5), f(0, 4))
    expect(() => divideSteps(f(3, 5), f(0, 4))).not.toThrow()
    expect(() => diagnose(problem, '1')).not.toThrow()
    expect(() => verifyByInverse('divide', f(3, 5), f(0, 4), f(1, 1))).not.toThrow()
    expect(() => estimateCheck(f(3, 5), f(0, 4), 'divide', f(1, 1))).not.toThrow()
    expect(() => sizeCheck('divide', f(3, 5), f(0, 4), f(1, 1))).not.toThrow()
  })
})

describe('multiplySteps', () => {
  it('4/9 x 3/8 shows cancelling 4 with 8 and 3 with 9', () => {
    const steps = multiplySteps(f(4, 9), f(3, 8))
    expect(steps.map((s) => s.kind)).toEqual(['cancel', 'multiplyAcross', 'answer'])
    const cancel = steps[0]!
    expect(cancel.description).toContain('4 and 8 can both be divided by 4')
    expect(cancel.description).toContain('3 and 9 can both be divided by 3')
    expect(cancel.expression).toBe('4/9 × 3/8 = 1/3 × 1/2')
    expect(steps[1]!.expression).toBe('1/3 × 1/2 = 1/6')
    expect(steps.at(-1)!.expression).toBe('1/6')
  })

  it('3/5 x 10 writes the whole number as 10/1, cancels, and ends as a whole number', () => {
    const steps = multiplySteps(f(3, 5), whole(10))
    expect(steps.map((s) => s.kind)).toEqual(['toImproper', 'cancel', 'multiplyAcross', 'toMixed', 'answer'])
    expect(steps[0]!.expression).toBe('3/5 × 10 = 3/5 × 10/1')
    expect(steps[1]!.description).toContain('10 and 5 can both be divided by 5')
    expect(steps[3]!.expression).toBe('6/1 = 6')
    expect(steps.at(-1)!.expression).toBe('6')
  })

  it('1 3/4 x 2 converts to an improper fraction and ends as a mixed number', () => {
    const steps = multiplySteps(m(1, 3, 4), whole(2))
    expect(steps[0]).toMatchObject({ kind: 'toImproper', expression: '1 3/4 × 2 = 7/4 × 2/1' })
    expect(steps.find((s) => s.kind === 'toMixed')!.expression).toBe('7/2 = 3 1/2')
    expect(steps.at(-1)!.expression).toBe('3 1/2')
  })

  it('2 1/2 x 3 1/3 becomes 5/2 x 10/3, cancels 10 with 2, and gives 8 1/3', () => {
    const steps = multiplySteps(m(2, 1, 2), m(3, 1, 3))
    expect(steps[0]!.expression).toBe('2 1/2 × 3 1/3 = 5/2 × 10/3')
    expect(steps[1]!.description).toContain('10 and 2 can both be divided by 2')
    expect(steps.find((s) => s.kind === 'multiplyAcross')!.expression).toBe('5/1 × 5/3 = 25/3')
    expect(steps.at(-1)!.expression).toBe('8 1/3')
  })

  it('skips the cancel step when nothing cancels, and simplifies an unreduced answer', () => {
    expect(multiplySteps(f(1, 2), f(1, 3)).map((s) => s.kind)).toEqual(['multiplyAcross', 'answer'])
    const unreduced = multiplySteps(f(6, 8), f(1, 3))
    expect(unreduced.some((s) => s.kind === 'simplify')).toBe(true)
    expect(unreduced.at(-1)!.expression).toBe('1/4')
  })

  it('every step has a kid-friendly sentence and an expression', () => {
    for (const steps of [multiplySteps(m(2, 1, 2), m(3, 1, 3)), divideSteps(m(2, 1, 4), m(1, 1, 2))]) {
      for (const step of steps) {
        expect(step.description).toMatch(/\.$/)
        expect(step.expression.length).toBeGreaterThan(0)
      }
    }
  })

  it('handles a zero factor and rejects negatives', () => {
    expect(multiplySteps(f(0, 3), f(2, 5)).at(-1)!.expression).toBe('0')
    expect(() => multiplySteps(f(-1, 2), f(1, 3))).toThrow(RangeError)
  })
})

describe('divideSteps', () => {
  it('2/3 ÷ 4/9: keep, change, flip, cancel, multiply', () => {
    const steps = divideSteps(f(2, 3), f(4, 9))
    expect(steps.map((s) => s.kind)).toEqual(['flip', 'cancel', 'multiplyAcross', 'toMixed', 'answer'])
    expect(steps[0]!.expression).toBe('2/3 ÷ 4/9 = 2/3 × 9/4')
    expect(steps[0]!.description).toMatch(/Keep the first fraction.*change ÷ to ×.*flip the second/)
    expect(steps.at(-1)!.expression).toBe('1 1/2')
  })

  it('6 ÷ 2/3 writes 6 as 6/1 first', () => {
    const steps = divideSteps(whole(6), f(2, 3))
    expect(steps[0]).toMatchObject({ kind: 'toImproper', expression: '6 ÷ 2/3 = 6/1 ÷ 2/3' })
    expect(steps[1]!.expression).toBe('6/1 ÷ 2/3 = 6/1 × 3/2')
    expect(steps.at(-1)!.expression).toBe('9')
  })

  it('5 ÷ 8 = 5/8 (both whole numbers)', () => {
    const steps = divideSteps(whole(5), whole(8))
    expect(steps[0]!.expression).toBe('5 ÷ 8 = 5/1 ÷ 8/1')
    expect(steps[1]!.expression).toBe('5/1 ÷ 8/1 = 5/1 × 1/8')
    expect(steps.at(-1)!.expression).toBe('5/8')
  })

  it('2 1/4 ÷ 1 1/2 converts both mixed numbers', () => {
    const steps = divideSteps(m(2, 1, 4), m(1, 1, 2))
    expect(steps[0]!.expression).toBe('2 1/4 ÷ 1 1/2 = 9/4 ÷ 3/2')
    expect(steps.at(-1)!.expression).toBe('1 1/2')
  })

  it('3/4 ÷ 3 = 1/4', () => expect(divideSteps(f(3, 4), whole(3)).at(-1)!.expression).toBe('1/4'))

  it('dividing by zero is a single, kind step', () => {
    for (const zero of [whole(0), f(0, 4)]) {
      const steps = divideSteps(f(3, 5), zero)
      expect(steps).toHaveLength(1)
      expect(steps[0]).toMatchObject({ kind: 'divideByZero' })
      expect(steps[0]!.description).toMatch(/can’t divide by zero/)
    }
  })

  it('the last step always matches the engine answer', () => {
    for (const [a, b] of [[f(2, 3), f(4, 9)], [whole(6), f(2, 3)], [m(2, 1, 4), m(1, 1, 2)]] as Array<[Operand, Operand]>) {
      expect(divideSteps(a, b).at(-1)!.expression).toBe(text(value(divide(a, b))))
    }
  })

  it('workedSteps picks the right steps for each operation', () => {
    expect(workedSteps({ op: 'multiply', a: f(2, 3), b: f(3, 4) })).toEqual(multiplySteps(f(2, 3), f(3, 4)))
    expect(workedSteps({ op: 'divide', a: f(2, 3), b: f(4, 9) })).toEqual(divideSteps(f(2, 3), f(4, 9)))
    expect(workedSteps({ op: 'add', a: f(1, 2), b: f(1, 3) }).at(-1)!.expression).toBe('5/6')
    expect(workedSteps({ op: 'subtract', a: f(1, 2), b: f(1, 3) }).at(-1)!.expression).toBe('1/6')
  })
})

describe('diagnose multiplication and division', () => {
  const answerSteps = (problem: MulProblem, answer: string) => {
    const d = diagnose(problem, answer)
    return { d, step: d.stepIndex === null ? null : workedSteps(problem)[d.stepIndex]!.kind }
  }

  it('2 1/2 x 3 1/3 answered as 6 1/6: multiplied the parts separately (at the convert step)', () => {
    const { d, step } = answerSteps(mulProblem('multiply', m(2, 1, 2), m(3, 1, 3)), '6 1/6')
    expect(d.slip).toBe('multipliedPartsSeparately')
    expect(step).toBe('toImproper')
    expect(d.hint).toMatch(/\?$/)
  })

  it('1 3/4 x 2 answered as 2 3/4 or 2 1/2: forgot to convert the mixed number', () => {
    for (const answer of ['2 3/4', '2 1/2']) {
      const { d, step } = answerSteps(mulProblem('multiply', m(1, 3, 4), whole(2)), answer)
      expect(d.slip).toBe('forgotToConvertMixed')
      expect(step).toBe('toImproper')
    }
  })

  it('2 1/4 ÷ 1 1/2 answered as 2 1/2: divided the parts separately, so forgot to convert', () => {
    const { d, step } = answerSteps(mulProblem('divide', m(2, 1, 4), m(1, 1, 2)), '2 1/2')
    expect(d.slip).toBe('forgotToConvertMixed')
    expect(step).toBe('toImproper')
  })

  it('2/3 ÷ 4/9 answered as 8/27: forgot the reciprocal (at the flip step)', () => {
    const { d, step } = answerSteps(mulProblem('divide', f(2, 3), f(4, 9)), '8/27')
    expect(d.slip).toBe('forgotReciprocal')
    expect(step).toBe('flip')
  })

  it('2/3 ÷ 4/9 answered as 2/3: flipped the wrong fraction (at the flip step)', () => {
    const { d, step } = answerSteps(mulProblem('divide', f(2, 3), f(4, 9)), '2/3')
    expect(d.slip).toBe('flippedWrongFraction')
    expect(step).toBe('flip')
  })

  it('cancelling top with top, or bottom with bottom, is a cancelling slip', () => {
    // 6/7 x 9/5 = 54/35. Cancelling the tops 6 and 9 by 3 wrongly gives 2 x 3 / 35 = 6/35.
    const tops = answerSteps(mulProblem('multiply', f(6, 7), f(9, 5)), '6/35')
    expect(tops.d.slip).toBe('cancellingSlip')
    expect(tops.step).toBe('multiplyAcross')
    // 5/6 x 7/9 = 35/54. Cancelling the bottoms 6 and 9 by 3 wrongly gives 35 / (2 x 3) = 35/6.
    const bottoms = answerSteps(mulProblem('multiply', f(5, 6), f(7, 9)), '5 5/6')
    expect(bottoms.d.slip).toBe('cancellingSlip')
  })

  it('a wrong top number over the right bottom number is an arithmetic slip at the multiply step', () => {
    const { d, step } = answerSteps(mulProblem('multiply', f(2, 3), f(3, 4)), '3/2')
    expect(d.slip).toBe('numeratorArithmetic')
    expect(step).toBe('multiplyAcross')
    expect(d.hint).toBe('Check the top and bottom numbers you multiplied again?')
  })

  it('a right answer that is not simplest is notSimplified, and a simplest right answer is "none"', () => {
    const p = mulProblem('multiply', f(2, 3), f(3, 4))
    expect(diagnose(p, '3/6').slip).toBe('notSimplified')
    expect(diagnose(p, '1/2').slip).toBe('none')
    expect(diagnose(mulProblem('divide', f(2, 3), f(4, 9)), '3/2').slip).toBe('notSimplified')
  })

  it('an unrelated or unreadable answer is unknown, without throwing', () => {
    const p = mulProblem('multiply', f(2, 3), f(3, 4))
    for (const input of ['17', 'banana', '', '1/0']) {
      expect(() => diagnose(p, input)).not.toThrow()
      expect(diagnose(p, input).slip).toBe('unknown')
    }
    expect(diagnose(p, '17').hint).toBe('What is the first thing to do with these numbers?')
  })

  it('still diagnoses addition and subtraction exactly as before', () => {
    expect(diagnose({ op: 'subtract', a: m(8, 1, 5), b: m(4, 3, 4) }, '3 11/20').slip).toBe('numeratorArithmetic')
    expect(diagnose({ op: 'add', a: f(1, 5), b: f(3, 4) }, '4/9').slip).toBe('addedDenominators')
  })

  it('every hint is one short question that never gives the answer', () => {
    const cases: Array<[MulProblem, string, string]> = [
      [mulProblem('multiply', m(2, 1, 2), m(3, 1, 3)), '6 1/6', '8 1/3'],
      [mulProblem('multiply', m(1, 3, 4), whole(2)), '2 3/4', '3 1/2'],
      [mulProblem('divide', f(2, 3), f(4, 9)), '8/27', '1 1/2'],
      [mulProblem('divide', f(2, 3), f(4, 9)), '2/3', '1 1/2'],
      [mulProblem('multiply', f(6, 7), f(9, 5)), '6/35', '1 19/35'],
      [mulProblem('multiply', f(2, 3), f(3, 4)), '3/2', '1/2'],
      [mulProblem('multiply', f(2, 3), f(3, 4)), '17', '1/2'],
    ]
    for (const [problem, wrong, right] of cases) {
      const { hint } = diagnose(problem, wrong)
      expect(hint, wrong).toMatch(/\?$/)
      expect((hint.match(/\?/g) ?? []).length).toBe(1)
      expect(words(hint)).toBeLessThanOrEqual(12)
      expect(hint).not.toContain(right)
    }
  })

  it('the new slips have kind names', () => {
    expect(slipName('multipliedPartsSeparately', 'add')).toBe('multiplying the parts separately')
    expect(slipName('forgotReciprocal', 'add')).toBe('forgetting to flip')
    expect(slipName('flippedWrongFraction', 'add')).toBe('flipping the wrong fraction')
    expect(slipName('forgotToConvertMixed', 'add')).toBe('a mixed number slip')
    expect(slipName('cancellingSlip', 'add')).toBe('a cancelling slip')
  })
})

describe('verifyByInverse for all four operations', () => {
  it('multiply: a x b = r is checked with r ÷ b = a', () => {
    const r = multiply(m(2, 1, 2), m(3, 1, 3))
    expect(verifyByInverse('multiply', m(2, 1, 2), m(3, 1, 3), r)).toEqual({
      holds: true,
      expression: '8 1/3 ÷ 3 1/3 = 2 1/2',
    })
    expect(verifyByInverse('multiply', m(2, 1, 2), m(3, 1, 3), f(7, 1)).holds).toBe(false)
  })

  it('divide: a ÷ b = r is checked with r x b = a', () => {
    expect(verifyByInverse('divide', f(2, 3), f(4, 9), f(3, 2))).toEqual({
      holds: true,
      expression: '1 1/2 × 4/9 = 2/3',
    })
    expect(verifyByInverse('divide', f(2, 3), f(4, 9), f(8, 27)).holds).toBe(false)
  })

  it('still works for addition and subtraction', () => {
    expect(verifyByInverse('add', f(1, 2), f(1, 3), f(5, 6)).holds).toBe(true)
    expect(verifyByInverse('subtract', f(1, 2), f(1, 3), f(1, 6)).holds).toBe(true)
  })

  it('a check that would divide by zero does not hold, and does not throw', () => {
    expect(verifyByInverse('multiply', f(3, 5), whole(0), whole(0)).holds).toBe(false)
    expect(verifyByInverse('divide', f(3, 5), whole(0), whole(1)).holds).toBe(false)
  })
})

describe('estimateCheck for multiplication and division', () => {
  it('8 1/5 x 4 3/4 rounds to 8 x 5, and the right answer is close', () => {
    const e = estimateCheck(m(8, 1, 5), m(4, 3, 4), 'multiply', multiply(m(8, 1, 5), m(4, 3, 4)))
    expect(text(e.roundedA)).toBe('8')
    expect(text(e.roundedB)).toBe('5')
    expect(text(e.estimate)).toBe('40')
    expect(e.close).toBe(true)
    expect(e.reliable).toBe(true)
  })

  it('says a wrong answer is not close', () => {
    expect(estimateCheck(m(8, 1, 5), m(4, 3, 4), 'multiply', whole(12)).close).toBe(false)
    expect(estimateCheck(m(8, 1, 5), m(4, 3, 4), 'multiply', whole(400)).close).toBe(false)
  })

  it('3/5 x 10: the right answer 6 is close, 20 is not', () => {
    expect(estimateCheck(f(3, 5), whole(10), 'multiply', whole(6)).close).toBe(true)
    expect(estimateCheck(f(3, 5), whole(10), 'multiply', whole(20)).close).toBe(false)
  })

  it('6 ÷ 2/3: the right answer 9 is close, 1 is not', () => {
    const e = estimateCheck(whole(6), f(2, 3), 'divide', whole(9))
    expect(text(e.roundedB)).toBe('1/2')
    expect(text(e.estimate)).toBe('12')
    expect(e.close).toBe(true)
    expect(estimateCheck(whole(6), f(2, 3), 'divide', whole(1)).close).toBe(false)
  })

  it('a divisor under 1/4 is too small to estimate: unreliable, and never marked wrong', () => {
    const e = estimateCheck(f(3, 4), f(1, 8), 'divide', whole(6))
    expect(e.reliable).toBe(false)
    expect(e.close).toBe(true)
  })

  it('still behaves as before for addition and subtraction, and is reliable', () => {
    const e = estimateCheck(m(8, 1, 5), m(4, 3, 4), 'subtract', m(3, 9, 20))
    expect(text(e.estimate)).toBe('3')
    expect(e.close).toBe(true)
    expect(e.reliable).toBe(true)
  })

  it('a correct answer is always close (multiply, and divide when the divisor is at least 1/4)', () => {
    for (let wa = 0; wa <= 9; wa++) {
      for (const [na, da] of [[0, 1], [1, 2], [1, 5], [3, 4], [5, 12], [2, 7], [7, 8]] as const) {
        for (const [nb, db] of [[1, 4], [1, 3], [2, 3], [9, 10], [1, 2], [3, 8], [5, 4]] as const) {
          for (let wb = 0; wb <= 6; wb++) {
            const a = m(wa, na, da)
            const b = m(wb, nb, db)
            expect(estimateCheck(a, b, 'multiply', multiply(a, b)).close).toBe(true)
            expect(estimateCheck(a, b, 'divide', value(divide(a, b))).close).toBe(true)
          }
        }
      }
    }
  })
})

describe('sizeCheck (the deep-understanding rule)', () => {
  it('flags 6 x 1/2 = 12: multiplying by a fraction less than 1 makes it smaller', () => {
    const check = sizeCheck('multiply', whole(6), f(1, 2), whole(12))
    expect(check).toMatchObject({ applies: true, ok: false })
    expect(check.message).toBe('1/2 is less than 1, so multiplying makes 6 smaller. Check your answer.')
  })

  it('flags 6 ÷ 1/2 = 3: dividing by a fraction less than 1 makes it bigger', () => {
    const check = sizeCheck('divide', whole(6), f(1, 2), whole(3))
    expect(check).toMatchObject({ applies: true, ok: false })
    expect(check.message).toBe('1/2 is less than 1, so dividing makes 6 bigger. Check your answer.')
  })

  it('accepts answers that follow the rule', () => {
    expect(sizeCheck('multiply', whole(6), f(1, 2), whole(3))).toEqual({ applies: true, ok: true, message: null })
    expect(sizeCheck('divide', whole(6), f(1, 2), whole(12))).toEqual({ applies: true, ok: true, message: null })
  })

  it('works when the fraction is the first factor too', () => {
    expect(sizeCheck('multiply', f(1, 2), whole(6), whole(12)).ok).toBe(false)
    expect(sizeCheck('multiply', f(2, 3), f(3, 4), f(1, 2)).ok).toBe(true)
  })

  it('an answer equal to the starting number also breaks the rule', () => {
    expect(sizeCheck('multiply', whole(6), f(1, 2), whole(6)).ok).toBe(false)
    expect(sizeCheck('divide', whole(6), f(1, 2), whole(6)).ok).toBe(false)
  })

  it('says nothing when the rule does not apply (no factor between 0 and 1, zero, or 1)', () => {
    for (const [op, a, b] of [
      ['multiply', whole(6), whole(2)],
      ['multiply', whole(6), whole(1)],
      ['multiply', whole(6), whole(0)],
      ['divide', whole(6), whole(2)],
      ['divide', whole(6), whole(0)],
      ['divide', whole(0), f(1, 2)],
    ] as const) {
      expect(sizeCheck(op, a, b, whole(1)), `${op} ${text(a)} ${text(b)}`).toEqual({ applies: false, ok: true, message: null })
    }
  })

  it('every message is kid-friendly: one sentence of facts and one short instruction', () => {
    const messages = [
      sizeCheck('multiply', whole(6), f(1, 2), whole(12)).message!,
      sizeCheck('divide', whole(6), f(1, 2), whole(3)).message!,
    ]
    for (const message of messages) expect(words(message)).toBeLessThanOrEqual(20)
  })
})

describe('properties (fast-check, 1000 runs each)', () => {
  const runs = { numRuns: 1000 }
  const fractionArb = fc.record({ numerator: fc.integer({ min: 0, max: 60 }), denominator: fc.integer({ min: 1, max: 30 }) })
  const mixedArb = fc.record({
    whole: fc.integer({ min: 0, max: 20 }),
    num: fc.integer({ min: 0, max: 60 }),
    den: fc.integer({ min: 1, max: 30 }),
  })
  const anyArb = fc.oneof(fractionArb, mixedArb)
  const nonZeroArb = anyArb.filter((x) => !isZero(x))
  const one = f(1, 1)

  const asFraction = (x: Operand): Fraction => ('numerator' in x ? x : f(x.whole * x.den + x.num, x.den))
  const cross = (x: Fraction, y: Fraction) => x.numerator * y.denominator === y.numerator * x.denominator
  const mustValue = (r: DivideResult) => (r.ok ? r.value : null)

  it('multiply is commutative', () => {
    fc.assert(fc.property(anyArb, anyArb, (a, b) => equals(multiply(a, b), multiply(b, a))), runs)
  })

  it('divide(multiply(a, b), b) equals a', () => {
    fc.assert(
      fc.property(anyArb, nonZeroArb, (a, b) => {
        const back = divide(multiply(a, b), b)
        expect(back.ok).toBe(true)
        expect(equals(value(back), a)).toBe(true)
      }),
      runs,
    )
  })

  it('multiply(a, reciprocal(a)) equals 1', () => {
    fc.assert(
      fc.property(nonZeroArb, (a) => {
        expect(equals(multiply(a, value(reciprocal(a))), one)).toBe(true)
      }),
      runs,
    )
  })

  it('divide(a, b) equals multiply(a, reciprocal(b))', () => {
    fc.assert(
      fc.property(anyArb, nonZeroArb, (a, b) => {
        expect(equals(value(divide(a, b)), multiply(a, value(reciprocal(b))))).toBe(true)
      }),
      runs,
    )
  })

  it('a x (b + c) equals a x b + a x c', () => {
    fc.assert(
      fc.property(anyArb, anyArb, anyArb, (a, b, c) => {
        expect(equals(multiply(a, add(b, c)), add(multiply(a, b), multiply(a, c)))).toBe(true)
      }),
      runs,
    )
  })

  it('verifyByInverse is always true for engine results, for both operations', () => {
    fc.assert(
      fc.property(anyArb, nonZeroArb, (a, b) => {
        expect(verifyByInverse('multiply', a, b, multiply(a, b)).holds).toBe(true)
        expect(verifyByInverse('divide', a, b, value(divide(a, b))).holds).toBe(true)
      }),
      runs,
    )
  })

  it('results are always simplified with a positive denominator', () => {
    fc.assert(
      fc.property(anyArb, nonZeroArb, (a, b) => {
        const results = [multiply(a, b), value(divide(a, b)), value(reciprocal(b))]
        for (const r of results) {
          expect(r.denominator).toBeGreaterThan(0)
          expect(gcd(r.numerator, r.denominator)).toBe(1)
          if (r.numerator >= 0) expect(isSimplestMixed(toMixed(r))).toBe(true)
        }
      }),
      runs,
    )
  })

  it('agrees with an independent cross-multiplication check', () => {
    fc.assert(
      fc.property(anyArb, nonZeroArb, (a, b) => {
        const x = asFraction(a)
        const y = asFraction(b)
        // (a/b)(c/d) = ac/bd  and  (a/b) ÷ (c/d) = ad/bc, compared by cross-multiplying.
        expect(cross(multiply(a, b), f(x.numerator * y.numerator, x.denominator * y.denominator))).toBe(true)
        expect(cross(value(divide(a, b)), f(x.numerator * y.denominator, x.denominator * y.numerator))).toBe(true)
      }),
      runs,
    )
  })

  it('dividing by zero is always an error result, never a number', () => {
    fc.assert(
      fc.property(anyArb, fc.constantFrom(f(0, 1), f(0, 7), m(0, 0, 3)), (a, zero) => {
        expect(mustValue(divide(a, zero))).toBeNull()
        expect(mustValue(reciprocal(zero))).toBeNull()
      }),
      runs,
    )
  })

  it('compare agrees with the order of the values', () => {
    fc.assert(
      fc.property(anyArb, anyArb, (a, b) => {
        const x = asFraction(a)
        const y = asFraction(b)
        expect(Math.sign(compare(a, b))).toBe(Math.sign(x.numerator / x.denominator - y.numerator / y.denominator))
      }),
      runs,
    )
  })
})

describe('wrong operation for multiplication and division', () => {
  const REPEATED = 'Multiplying is repeated adding. How many times should you add it?'
  const PART_OR_SPLIT = 'Are we taking a part of it, or splitting it up?'

  it('multiplying answered by adding: "Multiplying is repeated adding. How many times should you add it?"', () => {
    // 2/3 × 3/4 = 1/2, but 2/3 + 3/4 = 1 5/12
    const d = diagnose(mulProblem('multiply', f(2, 3), f(3, 4)), '1 5/12')
    expect(d).toEqual({ slip: 'wrongOperation', stepIndex: null, hint: REPEATED })
    // 3/5 × 10 answered as 3/5 + 10
    expect(diagnose(mulProblem('multiply', f(3, 5), whole(10)), '10 3/5').hint).toBe(REPEATED)
    // 2 1/2 × 3 1/3 answered as the sum 5 5/6
    expect(diagnose(mulProblem('multiply', m(2, 1, 2), m(3, 1, 3)), '5 5/6').hint).toBe(REPEATED)
  })

  it('multiplying answered by subtracting or dividing: "taking a part of it, or splitting it up?"', () => {
    const p = mulProblem('multiply', f(2, 3), f(3, 4))
    expect(diagnose(p, '1/12').hint).toBe(PART_OR_SPLIT) // 3/4 - 2/3
    expect(diagnose(p, '8/9').hint).toBe(PART_OR_SPLIT) // 2/3 ÷ 3/4
    expect(diagnose(p, '1 1/8').hint).toBe(PART_OR_SPLIT) // 3/4 ÷ 2/3 (divided the other way round)
    expect(diagnose(p, '1/12').slip).toBe('wrongOperation')
  })

  it('dividing answered by adding or subtracting: "taking a part of it, or splitting it up?"', () => {
    const p = mulProblem('divide', whole(6), f(2, 3))
    expect(diagnose(p, '6 2/3')).toMatchObject({ slip: 'wrongOperation', hint: PART_OR_SPLIT, stepIndex: null }) // 6 + 2/3
    expect(diagnose(p, '5 1/3').hint).toBe(PART_OR_SPLIT) // 6 - 2/3
  })

  it('dividing answered by multiplying is still "forgot the reciprocal", which is more specific', () => {
    expect(diagnose(mulProblem('divide', f(2, 3), f(4, 9)), '8/27').slip).toBe('forgotReciprocal')
    expect(diagnose(mulProblem('divide', whole(6), f(2, 3)), '4').slip).toBe('forgotReciprocal')
  })

  it('a right answer is never called a wrong operation, even when two operations agree (2 × 2 = 2 + 2)', () => {
    expect(diagnose(mulProblem('multiply', whole(2), whole(2)), '4').slip).toBe('none')
    expect(diagnose(mulProblem('divide', whole(2), whole(1)), '2').slip).toBe('none')
  })

  it('does not call a different wrong answer a wrong operation', () => {
    expect(diagnose(mulProblem('multiply', f(2, 3), f(3, 4)), '17').slip).toBe('unknown')
  })

  it('does not mix up the add and subtract hint for add and subtract problems', () => {
    expect(diagnose({ op: 'subtract', a: m(8, 1, 5), b: m(4, 3, 4) }, '12 19/20').hint).toBe('Are we putting together or taking away?')
  })

  it('every hint is one short question, never the answer, and ends with a question mark', () => {
    for (const hint of [REPEATED, PART_OR_SPLIT]) {
      expect(hint).toMatch(/\?$/)
      expect((hint.match(/\?/g) ?? []).length).toBe(1)
      expect(words(hint)).toBeLessThanOrEqual(12)
      expect(hint).not.toMatch(/\d/)
    }
  })

  it('works for every generated multiply and divide problem: the sum is always caught for multiplying', () => {
    for (let wa = 1; wa <= 5; wa++) {
      for (const [na, da] of [[1, 2], [2, 3], [3, 4]] as const) {
        for (const [nb, db] of [[1, 3], [5, 6], [3, 8]] as const) {
          const a = m(wa, na, da)
          const b = m(wa + 1, nb, db)
          if (equals(add(a, b), multiply(a, b))) continue // the sum is the right answer here, so it is not a slip
          const sum = formatMixed(add(a, b))
          expect(diagnose(mulProblem('multiply', a, b), sum).hint).toBe(REPEATED)
        }
      }
    }
  })
})
