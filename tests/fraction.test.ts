import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  add,
  addSteps,
  checkAnswer,
  diagnose,
  equals,
  formatMixed,
  gcd,
  isNegative,
  isSimplestMixed,
  lcm,
  makeFraction,
  parse,
  parseMixed,
  simplify,
  subtract,
  subtractSteps,
  toImproper,
  toMixed,
  verifyByInverse,
  type Fraction,
  type MixedNumber,
} from '../app/utils/fraction'

const mixed = (whole: number, num: number, den: number): Fraction => toImproper({ whole, num, den })
const m = (whole: number, num: number, den: number): MixedNumber => ({ whole, num, den })

describe('makeFraction', () => {
  it('rejects zero or negative denominators and non-integers', () => {
    expect(() => makeFraction(1, 0)).toThrow(RangeError)
    expect(() => makeFraction(1, -2)).toThrow(RangeError)
    expect(() => makeFraction(1.5, 2)).toThrow(RangeError)
  })
})

describe('simplify', () => {
  it('reduces to lowest terms', () => {
    expect(simplify({ numerator: 6, denominator: 8 })).toEqual({ numerator: 3, denominator: 4 })
    expect(simplify({ numerator: 0, denominator: 5 })).toEqual({ numerator: 0, denominator: 1 })
  })
  it('keeps an already reduced fraction', () => {
    expect(simplify({ numerator: 3, denominator: 4 })).toEqual({ numerator: 3, denominator: 4 })
  })
})

describe('toMixed / toImproper', () => {
  it('converts improper to mixed', () => {
    expect(toMixed({ numerator: 11, denominator: 4 })).toEqual(m(2, 3, 4))
    expect(toMixed({ numerator: 21, denominator: 5 })).toEqual(m(4, 1, 5))
    expect(toMixed({ numerator: 8, denominator: 4 })).toEqual(m(2, 0, 1))
  })
  it('converts mixed to improper', () => {
    expect(toImproper(m(2, 3, 4))).toEqual({ numerator: 11, denominator: 4 })
    expect(toImproper(m(3, 6, 5))).toEqual({ numerator: 21, denominator: 5 })
  })
  it('rejects negatives', () => {
    expect(() => toMixed({ numerator: -1, denominator: 2 })).toThrow(RangeError)
  })
})

describe('isSimplestMixed', () => {
  it('requires a proper, reduced fraction part', () => {
    expect(isSimplestMixed(m(4, 1, 5))).toBe(true)
    expect(isSimplestMixed(m(3, 6, 5))).toBe(false)
    expect(isSimplestMixed(m(2, 6, 8))).toBe(false)
    expect(isSimplestMixed(m(0, 21, 5))).toBe(false)
    expect(isSimplestMixed(m(5, 0, 1))).toBe(true)
  })
})

describe('equals', () => {
  it('3 6/5 equals 4 1/5 but is not simplest', () => {
    expect(equals(mixed(3, 6, 5), mixed(4, 1, 5))).toBe(true)
    expect(isSimplestMixed(m(3, 6, 5))).toBe(false)
    expect(isSimplestMixed(m(4, 1, 5))).toBe(true)
  })
  it('2 6/8, 11/4 and 1 7/4 all equal 2 3/4', () => {
    const target = mixed(2, 3, 4)
    expect(equals(mixed(2, 6, 8), target)).toBe(true)
    expect(equals({ numerator: 11, denominator: 4 }, target)).toBe(true)
    expect(equals(mixed(1, 7, 4), target)).toBe(true)
  })
  it('detects different values', () => {
    expect(equals({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 3 })).toBe(false)
  })
})

describe('add / subtract', () => {
  it('8 1/5 - 4 3/4 = 3 9/20', () => {
    expect(toMixed(subtract(mixed(8, 1, 5), mixed(4, 3, 4)))).toEqual(m(3, 9, 20))
  })
  it('9 - 3 5/6 = 5 1/6', () => {
    expect(toMixed(subtract(mixed(9, 0, 1), mixed(3, 5, 6)))).toEqual(m(5, 1, 6))
  })
  it('4 1/3 + 2 5/12 = 6 3/4', () => {
    expect(toMixed(add(mixed(4, 1, 3), mixed(2, 5, 12)))).toEqual(m(6, 3, 4))
  })
  it('can subtract to a negative fraction with positive denominator', () => {
    expect(subtract({ numerator: 1, denominator: 4 }, { numerator: 1, denominator: 2 })).toEqual({
      numerator: -1,
      denominator: 4,
    })
  })
})

describe('parseMixed', () => {
  it('parses mixed, fraction and whole inputs', () => {
    expect(parseMixed('3 6/5')).toEqual(m(3, 6, 5))
    expect(parseMixed('  21/5 ')).toEqual(m(0, 21, 5))
    expect(parseMixed('4')).toEqual(m(4, 0, 1))
  })
  it('returns null for invalid input', () => {
    for (const bad of ['', 'abc', '1/0', '1 2/0', '-1/2', '1.5', '1//2', '3 /5', '99999999999999999999']) {
      expect(parseMixed(bad)).toBeNull()
    }
  })
})

describe('gcd / lcm', () => {
  it('computes greatest common divisor and least common multiple', () => {
    expect(gcd(12, 18)).toBe(6)
    expect(gcd(0, 5)).toBe(5)
    expect(lcm(4, 6)).toBe(12)
    expect(lcm(5, 4)).toBe(20)
    expect(lcm(0, 4)).toBe(0)
  })
})

describe('parse / formatMixed / isNegative', () => {
  it('parses to an improper fraction', () => {
    expect(parse('3 6/5')).toEqual({ numerator: 21, denominator: 5 })
    expect(parse('4')).toEqual({ numerator: 4, denominator: 1 })
    expect(parse('1/0')).toBeNull()
    expect(parse('x')).toBeNull()
  })
  it('formats values in simplest mixed form', () => {
    expect(formatMixed({ numerator: 21, denominator: 5 })).toBe('4 1/5')
    expect(formatMixed(m(3, 0, 1))).toBe('3')
    expect(formatMixed({ numerator: 2, denominator: 3 })).toBe('2/3')
    expect(formatMixed({ numerator: -5, denominator: 4 })).toBe('-1 1/4')
  })
  it('flags negative results', () => {
    expect(isNegative(subtract({ numerator: 1, denominator: 4 }, { numerator: 1, denominator: 2 }))).toBe(true)
    expect(isNegative(mixed(1, 1, 2))).toBe(false)
  })
})

describe('add / subtract worked examples', () => {
  const cases: Array<[string, Fraction, string, Fraction, 'add' | 'subtract', string]> = [
    ['4 1/3', mixed(4, 1, 3), '2 5/12', mixed(2, 5, 12), 'add', '6 3/4'],
    ['4 3/5', mixed(4, 3, 5), '1 1/2', mixed(1, 1, 2), 'subtract', '3 1/10'],
    ['3/4', makeFraction(3, 4), '8 2/5', mixed(8, 2, 5), 'add', '9 3/20'],
    ['1 2/5', mixed(1, 2, 5), '1/6', makeFraction(1, 6), 'add', '1 17/30'],
    ['5 1/3', mixed(5, 1, 3), '2 3/5', mixed(2, 3, 5), 'add', '7 14/15'],
    ['7 14/15', mixed(7, 14, 15), '7 1/5', mixed(7, 1, 5), 'subtract', '11/15'],
    ['8 1/5', mixed(8, 1, 5), '4 3/4', mixed(4, 3, 4), 'subtract', '3 9/20'],
    ['9', mixed(9, 0, 1), '3 5/6', mixed(3, 5, 6), 'subtract', '5 1/6'],
    ['6 1/2', mixed(6, 1, 2), '1 1/4', mixed(1, 1, 4), 'subtract', '5 1/4'],
  ]
  for (const [aText, a, bText, b, op, expected] of cases) {
    it(`${aText} ${op === 'add' ? '+' : '-'} ${bText} = ${expected}`, () => {
      const result = op === 'add' ? add(a, b) : subtract(a, b)
      expect(formatMixed(result)).toBe(expected)
      expect(simplify(result)).toEqual(result)
    })
  }

  it('1 - 1/6 - 7/10 = 2/15', () => {
    const result = subtract(subtract(makeFraction(1, 1), makeFraction(1, 6)), makeFraction(7, 10))
    expect(formatMixed(result)).toBe('2/15')
  })

  it('accepts mixed-number objects as operands', () => {
    expect(formatMixed(add(m(4, 1, 3), m(2, 5, 12)))).toBe('6 3/4')
  })
})

describe('addSteps / subtractSteps', () => {
  it('8 1/5 - 4 3/4 renames, regroups to 7 24/20, then subtracts', () => {
    const steps = subtractSteps(mixed(8, 1, 5), mixed(4, 3, 4))
    expect(steps.map((s) => s.kind)).toEqual([
      'rename',
      'regroup',
      'subtractWholes',
      'subtractNumerators',
      'answer',
    ])
    expect(steps[0]!.expression).toBe('8 4/20 - 4 15/20')
    expect(steps[1]!.expression).toBe('7 24/20 - 4 15/20')
    expect(steps.at(-1)!.expression).toBe('3 9/20')
  })

  it('9 - 3 5/6 regroups a whole number', () => {
    const steps = subtractSteps(mixed(9, 0, 1), mixed(3, 5, 6))
    expect(steps.find((s) => s.kind === 'regroup')!.expression).toBe('8 6/6 - 3 5/6')
    expect(steps.at(-1)!.expression).toBe('5 1/6')
  })

  it('4 1/3 + 2 5/12 simplifies the fraction part', () => {
    const steps = addSteps(mixed(4, 1, 3), mixed(2, 5, 12))
    expect(steps.map((s) => s.kind)).toEqual([
      'rename',
      'addWholes',
      'addNumerators',
      'simplify',
      'answer',
    ])
    expect(steps.find((s) => s.kind === 'simplify')!.expression).toBe('9/12 = 3/4')
  })

  it('3/4 + 8 2/5 converts an improper fraction part to a mixed number', () => {
    const steps = addSteps(makeFraction(3, 4), mixed(8, 2, 5))
    const toMixedStep = steps.find((s) => s.kind === 'toMixed')!
    expect(toMixedStep.expression).toBe('8 23/20 = 9 3/20')
    expect(steps.at(-1)!.expression).toBe('9 3/20')
  })

  it('skips rename and regroup when they are not needed', () => {
    const steps = subtractSteps(mixed(6, 3, 4), mixed(1, 1, 4))
    expect(steps.some((s) => s.kind === 'rename' || s.kind === 'regroup')).toBe(false)
  })

  it('every step has a kind, a description and an expression', () => {
    for (const s of subtractSteps(mixed(8, 1, 5), mixed(4, 3, 4))) {
      expect(s.description.length).toBeGreaterThan(0)
      expect(s.expression.length).toBeGreaterThan(0)
    }
  })

  it('handles a negative result with a flagged final step', () => {
    const steps = subtractSteps(makeFraction(1, 4), makeFraction(1, 2))
    expect(steps.at(-1)!.kind).toBe('negative')
    expect(steps.at(-1)!.expression).toBe('-1/4')
  })
})

describe('checkAnswer', () => {
  const expected = mixed(4, 1, 5)

  it('accepts the simplest mixed form as correct', () => {
    expect(checkAnswer(expected, '4 1/5')).toEqual({ status: 'correct', simplestForm: '4 1/5' })
  })
  it('3 6/5 equals 4 1/5 but is correctNotSimplest', () => {
    expect(equals(mixed(3, 6, 5), expected)).toBe(true)
    expect(checkAnswer(expected, '3 6/5').status).toBe('correctNotSimplest')
    expect(checkAnswer(expected, '21/5').status).toBe('correctNotSimplest')
    expect(checkAnswer(mixed(2, 3, 4), '2 6/8').status).toBe('correctNotSimplest')
  })
  it('marks different values wrong', () => {
    expect(checkAnswer(expected, '4 2/5').status).toBe('wrong')
  })
  it('treats division by zero and invalid input as wrong without throwing', () => {
    for (const bad of ['1/0', '4 1/0', 'banana', '', '-1/2']) {
      expect(() => checkAnswer(expected, bad)).not.toThrow()
      expect(checkAnswer(expected, bad).status).toBe('wrong')
    }
  })
  it('handles whole-number answers', () => {
    expect(checkAnswer({ numerator: 5, denominator: 1 }, '5').status).toBe('correct')
    expect(checkAnswer({ numerator: 5, denominator: 1 }, '10/2').status).toBe('correctNotSimplest')
  })
})

describe('diagnose', () => {
  const sub = { op: 'subtract', a: mixed(8, 1, 5), b: mixed(4, 3, 4) } as const

  it('numerator arithmetic slip: 3 11/20 instead of 3 9/20', () => {
    const d = diagnose(sub, '3 11/20')
    expect(d.slip).toBe('numeratorArithmetic')
    expect(subtractSteps(sub.a, sub.b)[d.stepIndex!]!.kind).toBe('subtractNumerators')
  })
  it('forgot to regroup: 4 11/20', () => {
    const d = diagnose(sub, '4 11/20')
    expect(d.slip).toBe('forgotRegroup')
    expect(subtractSteps(sub.a, sub.b)[d.stepIndex!]!.kind).toBe('regroup')
  })
  it('whole arithmetic slip: right fraction, wrong whole', () => {
    const d = diagnose(sub, '4 9/20')
    expect(d.slip).toBe('wholeArithmetic')
    expect(subtractSteps(sub.a, sub.b)[d.stepIndex!]!.kind).toBe('subtractWholes')
  })
  it('added denominators: 1/5 + 3/4 = 4/9', () => {
    const problem = { op: 'add', a: makeFraction(1, 5), b: makeFraction(3, 4) } as const
    const d = diagnose(problem, '4/9')
    expect(d.slip).toBe('addedDenominators')
    expect(addSteps(problem.a, problem.b)[d.stepIndex!]!.kind).toBe('rename')
  })
  it('no common denominator: 1/5 + 3/4 = 4/5', () => {
    const problem = { op: 'add', a: makeFraction(1, 5), b: makeFraction(3, 4) } as const
    expect(diagnose(problem, '4/5').slip).toBe('noCommonDenominator')
  })
  it('not simplified: right value, fraction part too big or not reduced', () => {
    const problem = { op: 'add', a: mixed(4, 1, 3), b: mixed(2, 5, 12) } as const
    expect(diagnose(problem, '6 9/12').slip).toBe('notSimplified')
    expect(diagnose(problem, '6 3/4').slip).toBe('none')
  })
  it('unknown for unrelated or unparseable answers', () => {
    expect(diagnose(sub, '17').slip).toBe('unknown')
    expect(diagnose(sub, 'banana')).toMatchObject({ slip: 'unknown', stepIndex: null })
    expect(() => diagnose(sub, '1/0')).not.toThrow()
  })
  it('hints are questions and never contain the answer', () => {
    for (const input of ['3 11/20', '4 11/20', '4 9/20', '17']) {
      const { hint } = diagnose(sub, input)
      expect(hint).toMatch(/\?$/)
      expect(hint).not.toContain('3 9/20')
    }
  })
})

describe('verifyByInverse', () => {
  it('subtraction: result + b = a', () => {
    const a = mixed(8, 1, 5)
    const b = mixed(4, 3, 4)
    const result = subtract(a, b)
    expect(verifyByInverse('subtract', a, b, result)).toEqual({
      holds: true,
      expression: '3 9/20 + 4 3/4 = 8 1/5',
    })
  })
  it('addition: result - b = a', () => {
    const a = mixed(4, 1, 3)
    const b = mixed(2, 5, 12)
    expect(verifyByInverse('add', a, b, add(a, b))).toEqual({
      holds: true,
      expression: '6 3/4 - 2 5/12 = 4 1/3',
    })
  })
  it('fails for a wrong result', () => {
    const a = mixed(8, 1, 5)
    const b = mixed(4, 3, 4)
    expect(verifyByInverse('subtract', a, b, mixed(3, 11, 20)).holds).toBe(false)
  })
})

describe('properties (fast-check, 1000 runs each)', () => {
  const runs = { numRuns: 1000 }
  const fractionArb = fc
    .record({ numerator: fc.integer({ min: 0, max: 60 }), denominator: fc.integer({ min: 1, max: 30 }) })
  const mixedArb = fc
    .record({ whole: fc.integer({ min: 0, max: 20 }), num: fc.integer({ min: 0, max: 60 }), den: fc.integer({ min: 1, max: 30 }) })
  const operandArb = fc.oneof(fractionArb, mixedArb)

  const crossEq = (x: Fraction, y: Fraction) => x.numerator * y.denominator === y.numerator * x.denominator
  const toF = (o: Fraction | MixedNumber): Fraction =>
    'numerator' in o ? o : { numerator: o.whole * o.den + o.num, denominator: o.den }

  it('add is commutative', () => {
    fc.assert(
      fc.property(operandArb, operandArb, (a, b) => {
        expect(equals(add(a, b), add(b, a))).toBe(true)
      }),
      runs,
    )
  })

  it('subtract(add(a, b), b) equals a', () => {
    fc.assert(
      fc.property(operandArb, operandArb, (a, b) => {
        expect(equals(subtract(add(a, b), b), a)).toBe(true)
      }),
      runs,
    )
  })

  it('verifyByInverse holds for results from add and subtract', () => {
    fc.assert(
      fc.property(operandArb, operandArb, (a, b) => {
        expect(verifyByInverse('add', a, b, add(a, b)).holds).toBe(true)
        expect(verifyByInverse('subtract', a, b, subtract(a, b)).holds).toBe(true)
      }),
      runs,
    )
  })

  it('results are in simplest form with a positive denominator', () => {
    fc.assert(
      fc.property(operandArb, operandArb, (a, b) => {
        for (const r of [add(a, b), subtract(a, b)]) {
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
      fc.property(operandArb, operandArb, (a, b) => {
        const x = toF(a)
        const y = toF(b)
        const denominator = x.denominator * y.denominator
        const sum = { numerator: x.numerator * y.denominator + x.denominator * y.numerator, denominator }
        const diff = { numerator: x.numerator * y.denominator - x.denominator * y.numerator, denominator }
        expect(crossEq(add(a, b), sum)).toBe(true)
        expect(crossEq(subtract(a, b), diff)).toBe(true)
      }),
      runs,
    )
  })
})
