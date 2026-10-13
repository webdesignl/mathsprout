import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  add,
  addSteps,
  checkAnswer,
  diagnose,
  equals,
  estimateCheck,
  formatMixed,
  gcd,
  inverseProblem,
  isNegative,
  isSimplestMixed,
  lcm,
  makeFraction,
  parse,
  parseMixed,
  roundToHalf,
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
  it('wrong operation: added instead of subtracted, and the reverse', () => {
    // 8 1/5 + 4 3/4 = 12 19/20
    const d = diagnose(sub, '12 19/20')
    expect(d.slip).toBe('wrongOperation')
    expect(d.stepIndex).toBeNull()
    expect(d.hint).toBe('Are we putting together or taking away?')
    // 4 1/3 - 2 5/12 = 1 11/12
    const addProblem = { op: 'add', a: mixed(4, 1, 3), b: mixed(2, 5, 12) } as const
    expect(diagnose(addProblem, '1 11/12').slip).toBe('wrongOperation')
  })
  it('wrong operation is not flagged when the other operation would go below zero', () => {
    const small = { op: 'add', a: mixed(1, 1, 4), b: mixed(2, 1, 2) } as const
    expect(diagnose(small, '1').slip).not.toBe('wrongOperation')
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

describe('inverseProblem', () => {
  it('turns a subtraction into the add-back and gives the first number again', () => {
    const problem = { op: 'subtract', a: mixed(8, 1, 5), b: mixed(4, 3, 4) } as const
    const inverse = inverseProblem(problem)
    expect(inverse.op).toBe('add')
    expect(formatMixed(inverse.a)).toBe('3 9/20')
    expect(formatMixed(inverse.b)).toBe('4 3/4')
    expect(equals(add(inverse.a, inverse.b), problem.a)).toBe(true)
  })

  it('turns an addition into the take-away and gives the first number again', () => {
    const problem = { op: 'add', a: mixed(4, 1, 3), b: mixed(2, 5, 12) } as const
    const inverse = inverseProblem(problem)
    expect(inverse.op).toBe('subtract')
    expect(formatMixed(inverse.a)).toBe('6 3/4')
    expect(equals(subtract(inverse.a, inverse.b), problem.a)).toBe(true)
  })
})

describe('inverseProblem with a student answer', () => {
  it('builds the opposite problem from her answer, which does not give a back when she is wrong', () => {
    const problem = { op: 'subtract', a: mixed(8, 1, 5), b: mixed(4, 3, 4) } as const
    const her = toImproper({ whole: 3, num: 11, den: 20 })
    const inverse = inverseProblem(problem, her)
    expect(inverse.op).toBe('add')
    expect(formatMixed(add(inverse.a, inverse.b))).toBe('8 3/10')
    expect(equals(add(inverse.a, inverse.b), problem.a)).toBe(false)
  })
})

describe('roundToHalf', () => {
  const r = (n: number, d: number) => formatMixed(roundToHalf({ numerator: n, denominator: d }))

  it('rounds to the nearest half or whole', () => {
    expect(r(33, 4)).toBe('8 1/2') // 8 1/4 is a tie: rounds up to 8 1/2
    expect(r(41, 5)).toBe('8') // 8 1/5 -> 8
    expect(r(19, 4)).toBe('5') // 4 3/4 -> 5
    expect(r(13, 3)).toBe('4 1/2') // 4 1/3 -> 4 1/2
    expect(r(29, 12)).toBe('2 1/2') // 2 5/12 -> 2 1/2
    expect(r(0, 1)).toBe('0')
    expect(r(1, 8)).toBe('0')
    expect(r(3, 8)).toBe('1/2')
  })

  it('keeps halves and wholes as they are', () => {
    expect(r(9, 2)).toBe('4 1/2')
    expect(r(7, 1)).toBe('7')
  })

  it('rejects negatives', () => {
    expect(() => roundToHalf({ numerator: -1, denominator: 2 })).toThrow(RangeError)
  })

  it('always lands within 1/4 of the original', () => {
    for (let n = 0; n <= 200; n++) {
      for (const d of [1, 2, 3, 4, 5, 6, 7, 8, 10, 12]) {
        const rounded = roundToHalf({ numerator: n, denominator: d })
        const gap = subtract({ numerator: n, denominator: d }, rounded)
        expect(Math.abs(gap.numerator) * 4).toBeLessThanOrEqual(gap.denominator)
      }
    }
  })
})

describe('estimateCheck', () => {
  it('8 1/5 - 4 3/4: rounds to 8 and 5, so the estimate is 3', () => {
    const e = estimateCheck(mixed(8, 1, 5), mixed(4, 3, 4), 'subtract', mixed(3, 9, 20))
    expect(formatMixed(e.roundedA)).toBe('8')
    expect(formatMixed(e.roundedB)).toBe('5')
    expect(formatMixed(e.estimate)).toBe('3')
    expect(formatMixed(e.difference)).toBe('9/20')
    expect(e.close).toBe(true)
  })

  it('4 1/3 + 2 5/12: rounds to 4 1/2 and 2 1/2, so the estimate is 7', () => {
    const e = estimateCheck(mixed(4, 1, 3), mixed(2, 5, 12), 'add', mixed(6, 3, 4))
    expect(formatMixed(e.roundedA)).toBe('4 1/2')
    expect(formatMixed(e.roundedB)).toBe('2 1/2')
    expect(formatMixed(e.estimate)).toBe('7')
    expect(e.close).toBe(true) // 6 3/4 is 1/4 away
  })

  it('says a wrong answer is not close', () => {
    expect(estimateCheck(mixed(8, 1, 5), mixed(4, 3, 4), 'subtract', mixed(7, 0, 1)).close).toBe(false)
    expect(estimateCheck(mixed(8, 1, 5), mixed(4, 3, 4), 'subtract', mixed(12, 19, 20)).close).toBe(false) // added
    expect(estimateCheck(mixed(4, 1, 3), mixed(2, 5, 12), 'add', mixed(1, 11, 12)).close).toBe(false) // subtracted
  })

  it('exactly half a whole away still counts as close', () => {
    // estimate 3, answer 3 1/2
    expect(estimateCheck(mixed(8, 1, 5), mixed(4, 3, 4), 'subtract', mixed(3, 1, 2)).close).toBe(true)
    expect(estimateCheck(mixed(8, 1, 5), mixed(4, 3, 4), 'subtract', mixed(3, 11, 20)).close).toBe(false)
  })

  it('treats answers below the estimate the same as above it', () => {
    const above = estimateCheck(mixed(8, 1, 5), mixed(4, 3, 4), 'subtract', mixed(3, 1, 4))
    const below = estimateCheck(mixed(8, 1, 5), mixed(4, 3, 4), 'subtract', mixed(2, 3, 4))
    expect(above.difference).toEqual(below.difference)
    expect(above.close).toBe(below.close)
  })

  it('accepts plain fractions as operands and answers', () => {
    const e = estimateCheck({ numerator: 7, denominator: 8 }, mixed(0, 1, 3), 'add', { numerator: 25, denominator: 24 })
    expect(formatMixed(e.estimate)).toBe('1 1/2') // 1 + 1/2
    expect(e.close).toBe(true)
  })

  it('the correct answer is always close, for any numbers and either operation', () => {
    for (let wa = 0; wa <= 9; wa++) {
      for (const [na, da] of [[0, 1], [1, 2], [1, 5], [3, 4], [5, 12], [2, 7], [7, 8], [1, 3]] as const) {
        for (const [nb, db] of [[0, 1], [1, 4], [2, 3], [1, 6], [9, 10], [3, 8]] as const) {
          for (let wb = 0; wb <= wa; wb++) {
            const a = mixed(wa, na, da)
            const b = mixed(wb, nb, db)
            expect(estimateCheck(a, b, 'add', add(a, b)).close).toBe(true)
            if (subtract(a, b).numerator >= 0) {
              expect(estimateCheck(a, b, 'subtract', subtract(a, b)).close).toBe(true)
            }
          }
        }
      }
    }
  })
})
