import { describe, expect, it } from 'vitest'
import {
  isZero,
  problemAnswer,
  toFraction,
  verifyByInverse,
  workedSteps,
  type AnyProblem,
  type MixedNumber,
} from '../app/utils/fraction'
import {
  DIVIDE_LEVELS,
  MULTIPLY_LEVELS,
  describeProblem,
  generateProblem,
  generateSimilarProblem,
  levelOf,
  type MulLevel,
  type Random,
} from '../app/utils/problems'
import { withStory } from '../app/utils/stories'
import { pickRealWorldExamples } from '../app/utils/realWorld'

/** A small seeded generator (mulberry32) so failures are reproducible. */
function seeded(seed: number): Random {
  let t = seed
  return () => {
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const RUNS = 500
const asMixed = (x: unknown) => x as MixedNumber

/** Everything that must be true of any multiplication or division problem we make. */
function expectValid(problem: AnyProblem, max = 12) {
  const [a, b] = [asMixed(problem.a), asMixed(problem.b)]
  for (const m of [a, b]) {
    expect(Number.isInteger(m.whole) && Number.isInteger(m.num) && Number.isInteger(m.den)).toBe(true)
    expect(m.den).toBeGreaterThanOrEqual(1)
    expect(m.den).toBeLessThanOrEqual(max)
    expect(m.whole).toBeGreaterThanOrEqual(0)
    expect(m.whole).toBeLessThanOrEqual(9)
    expect(m.num).toBeGreaterThanOrEqual(0)
    expect(m.num).toBeLessThan(m.den)
    // Never zero, so nothing is divided by zero and no answer is zero.
    expect(isZero(m)).toBe(false)
  }
  const answer = problemAnswer(problem)
  expect(answer).not.toBeNull()
  expect(answer!.numerator).toBeGreaterThan(0)
  expect(answer!.denominator).toBeGreaterThan(0)
  expect(verifyByInverse(problem.op, problem.a, problem.b, answer!).holds).toBe(true)
  const steps = workedSteps(problem)
  expect(steps.at(-1)!.kind).toBe('answer')
}

describe('multiplication levels', () => {
  const shapes: Record<(typeof MULTIPLY_LEVELS)[number], (a: MixedNumber, b: MixedNumber) => boolean> = {
    fractionTimesWhole: (a, b) => a.whole === 0 && a.num > 0 && b.num === 0 && b.whole >= 2,
    fractionTimesFraction: (a, b) => a.whole === 0 && a.num > 0 && b.whole === 0 && b.num > 0,
    mixedTimesWhole: (a, b) => a.whole >= 1 && a.num > 0 && b.num === 0 && b.whole >= 2,
    mixedTimesMixed: (a, b) => a.whole >= 1 && a.num > 0 && b.whole >= 1 && b.num > 0,
  }
  for (const level of MULTIPLY_LEVELS) {
    it(`${level}: ${RUNS} random problems are valid and have the right shape`, () => {
      const rng = seeded(level.length * 7)
      for (let i = 0; i < RUNS; i++) {
        const p = generateProblem({ op: 'multiply', maxDenominator: 12, level }, rng)
        expect(p.op).toBe('multiply')
        expectValid(p)
        expect(shapes[level](asMixed(p.a), asMixed(p.b))).toBe(true)
        expect(levelOf(p)).toBe(level)
      }
    })
  }
})

describe('division levels', () => {
  const shapes: Record<(typeof DIVIDE_LEVELS)[number], (a: MixedNumber, b: MixedNumber) => boolean> = {
    wholeByFraction: (a, b) => a.num === 0 && a.whole >= 2 && b.whole === 0 && b.num > 0,
    fractionByWhole: (a, b) => a.whole === 0 && a.num > 0 && b.num === 0 && b.whole >= 2,
    fractionByFraction: (a, b) => a.whole === 0 && a.num > 0 && b.whole === 0 && b.num > 0,
    mixedByMixed: (a, b) => a.whole >= 1 && a.num > 0 && b.whole >= 1 && b.num > 0,
  }
  for (const level of DIVIDE_LEVELS) {
    it(`${level}: ${RUNS} random problems are valid, never divide by zero, and have the right shape`, () => {
      const rng = seeded(level.length * 11)
      for (let i = 0; i < RUNS; i++) {
        const p = generateProblem({ op: 'divide', maxDenominator: 12, level }, rng)
        expect(p.op).toBe('divide')
        expectValid(p)
        expect(isZero(p.b)).toBe(false)
        expect(shapes[level](asMixed(p.a), asMixed(p.b))).toBe(true)
        expect(levelOf(p)).toBe(level)
      }
    })
  }
})

describe('generateProblem for multiply, divide and all', () => {
  it('without a level it uses all four levels of that operation', () => {
    for (const [op, levels] of [['multiply', MULTIPLY_LEVELS], ['divide', DIVIDE_LEVELS]] as const) {
      const rng = seeded(5)
      const seen = new Set<MulLevel | null>()
      for (let i = 0; i < RUNS; i++) seen.add(levelOf(generateProblem({ op, maxDenominator: 12 }, rng)))
      expect(seen).toEqual(new Set(levels))
    }
  })

  it('"all" mixes all four operations, and every problem is valid', () => {
    const rng = seeded(21)
    const ops = new Set<string>()
    for (let i = 0; i < RUNS; i++) {
      const p = generateProblem({ op: 'all', maxDenominator: 12 }, rng)
      ops.add(p.op)
      const answer = problemAnswer(p)
      expect(answer).not.toBeNull()
      expect(answer!.numerator).toBeGreaterThanOrEqual(0)
      expect(verifyByInverse(p.op, p.a, p.b, answer!).holds).toBe(true)
    }
    expect(ops).toEqual(new Set(['add', 'subtract', 'multiply', 'divide']))
  })

  it('"mixed" still means adding and subtracting only', () => {
    const rng = seeded(8)
    const ops = new Set<string>()
    for (let i = 0; i < RUNS; i++) ops.add(generateProblem({ op: 'mixed', maxDenominator: 12 }, rng).op)
    expect(ops).toEqual(new Set(['add', 'subtract']))
  })

  it('respects the denominator limit', () => {
    const rng = seeded(3)
    for (let i = 0; i < RUNS; i++) {
      for (const op of ['multiply', 'divide'] as const) expectValid(generateProblem({ op, maxDenominator: 4 }, rng), 4)
    }
  })

  it('a level that belongs to the other operation is ignored', () => {
    const p = generateProblem({ op: 'multiply', maxDenominator: 12, level: 'wholeByFraction' }, seeded(1))
    expect(p.op).toBe('multiply')
    expect(MULTIPLY_LEVELS).toContain(levelOf(p))
  })

  it('is deterministic for the same injected random function', () => {
    const options = { op: 'all', maxDenominator: 12 } as const
    expect(generateProblem(options, seeded(9))).toEqual(generateProblem(options, seeded(9)))
  })

  it('terminates and stays valid with extreme random values', () => {
    for (const fixed of [0, 0.999999]) {
      for (const op of ['multiply', 'divide', 'all'] as const) {
        const p = generateProblem({ op, maxDenominator: 12 }, () => fixed)
        expect(problemAnswer(p)).not.toBeNull()
      }
    }
  })

  it('multiplying and dividing need a denominator of at least 2; adding and subtracting still need 3', () => {
    expect(() => generateProblem({ op: 'multiply', maxDenominator: 1 })).toThrow(RangeError)
    expect(() => generateProblem({ op: 'divide', maxDenominator: 1 })).toThrow(RangeError)
    expect(() => generateProblem({ op: 'add', maxDenominator: 2 })).toThrow(RangeError)
    expect(() => generateProblem({ op: 'multiply', maxDenominator: 2 }, seeded(1))).not.toThrow()
    expect(() => generateProblem({ op: 'all', maxDenominator: 2 }, () => 0)).toThrow(RangeError) // 0 picks adding
  })
})

describe('describeProblem and levelOf', () => {
  it('writes × and ÷ and never simplifies', () => {
    expect(describeProblem({ op: 'multiply', a: { whole: 0, num: 2, den: 6 }, b: { whole: 3, num: 0, den: 1 } })).toBe('2/6 × 3')
    expect(describeProblem({ op: 'divide', a: { whole: 2, num: 1, den: 4 }, b: { whole: 1, num: 1, den: 2 } })).toBe('2 1/4 ÷ 1 1/2')
  })

  it('knows plain fractions and improper fractions as operands', () => {
    expect(levelOf({ op: 'multiply', a: { numerator: 2, denominator: 3 }, b: { numerator: 6, denominator: 1 } })).toBe('fractionTimesWhole')
    expect(levelOf({ op: 'divide', a: { numerator: 9, denominator: 4 }, b: { numerator: 3, denominator: 2 } })).toBe('mixedByMixed')
  })

  it('is null for add, subtract and combinations that are not a level', () => {
    expect(levelOf({ op: 'add', a: { whole: 1, num: 1, den: 2 }, b: { whole: 1, num: 1, den: 3 } })).toBeNull()
    expect(levelOf({ op: 'multiply', a: { whole: 3, num: 0, den: 1 }, b: { whole: 3, num: 0, den: 1 } })).toBeNull()
  })
})

describe('generateSimilarProblem for multiply and divide', () => {
  it('keeps the operation and the level, and never repeats the same problem', () => {
    const rng = seeded(31)
    for (const level of [...MULTIPLY_LEVELS, ...DIVIDE_LEVELS]) {
      const op = (MULTIPLY_LEVELS as string[]).includes(level) ? 'multiply' : 'divide'
      const original = generateProblem({ op, maxDenominator: 12, level }, rng)
      for (let i = 0; i < 100; i++) {
        const like = generateSimilarProblem(original, 12, rng)
        expect(like.op).toBe(op)
        expect(levelOf(like)).toBe(level)
        expect(describeProblem(like)).not.toBe(describeProblem(original))
        expectValid(like)
      }
    }
  })
})

describe('stories for multiply and divide', () => {
  it('fill in both numbers, ask a question, and never leave a placeholder', () => {
    const rng = seeded(4)
    const topics = new Set<string | undefined>()
    for (let i = 0; i < 200; i++) {
      for (const op of ['multiply', 'divide'] as const) {
        const p = withStory(generateProblem({ op, maxDenominator: 12 }, rng), rng)
        expect(p.story).not.toMatch(/[{}]/)
        expect(p.story).toMatch(/\?$/)
        const [a, b] = [asMixed(p.a), asMixed(p.b)]
        for (const m of [a, b]) {
          const shown = m.num === 0 ? String(m.whole) : m.whole === 0 ? `${m.num}/${m.den}` : `${m.whole} ${m.num}/${m.den}`
          expect(p.story).toContain(shown)
        }
        topics.add(p.topic)
      }
    }
    expect(topics.size).toBe(4)
  })

  it('every kind of generated problem can be given a story (so the Story toggle never crashes)', () => {
    const rng = seeded(6)
    for (let i = 0; i < RUNS; i++) {
      const p = withStory(generateProblem({ op: 'all', maxDenominator: 12 }, rng), rng)
      expect(p.story).toBeTruthy()
    }
  })
})

describe('real-world ideas for multiply and divide', () => {
  it('has ideas for every operation, and picks them by the operations she practiced', () => {
    for (const op of ['multiply', 'divide'] as const) {
      const cards = pickRealWorldExamples([op], 3, [], () => 0.3)
      expect(cards).toHaveLength(3)
      expect(new Set(cards.map((c) => c.text)).size).toBe(3)
    }
    expect(pickRealWorldExamples(['add', 'subtract', 'multiply', 'divide'], 3, [], () => 0.5)).toHaveLength(3)
  })

  it('every answer in the problem set is a real fraction', () => {
    expect(toFraction(problemAnswer({ op: 'divide', a: { whole: 6, num: 0, den: 1 }, b: { whole: 0, num: 2, den: 3 } })!)).toEqual({ numerator: 9, denominator: 1 })
  })
})
