import { describe, expect, it } from 'vitest'
import { subtractSteps, type MixedNumber } from '../app/utils/fraction'
import { describeProblem, generateProblem, type Random } from '../app/utils/problems'
import { boxesToText, isAnswerEmpty, isFractionIncomplete } from '../app/utils/answer'

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

const asMixed = (m: unknown) => m as MixedNumber
const value = (m: MixedNumber) => ({ n: m.whole * m.den + m.num, d: m.den })
const lcd = (a: number, b: number) => {
  const g = (x: number, y: number): number => (y === 0 ? x : g(y, x % y))
  return (a / g(a, b)) * b
}

const RUNS = 500

describe('generateProblem', () => {
  for (const op of ['add', 'subtract', 'mixed'] as const) {
    it(`${op}: denominators in range and unlike, wholes 0 to 9, proper fraction parts`, () => {
      const rng = seeded(1)
      for (let i = 0; i < RUNS; i++) {
        const p = generateProblem({ op, maxDenominator: 12 }, rng)
        const [a, b] = [asMixed(p.a), asMixed(p.b)]
        for (const m of [a, b]) {
          expect(m.den).toBeGreaterThanOrEqual(2)
          expect(m.den).toBeLessThanOrEqual(12)
          expect(m.whole).toBeGreaterThanOrEqual(0)
          expect(m.whole).toBeLessThanOrEqual(9)
          expect(m.num).toBeGreaterThanOrEqual(1)
          expect(m.num).toBeLessThan(m.den)
        }
        expect(a.den).not.toBe(b.den)
      }
    })
  }

  it('respects a smaller maxDenominator', () => {
    const rng = seeded(2)
    for (let i = 0; i < RUNS; i++) {
      const p = generateProblem({ op: 'mixed', maxDenominator: 4 }, rng)
      expect(asMixed(p.a).den).toBeLessThanOrEqual(4)
      expect(asMixed(p.b).den).toBeLessThanOrEqual(4)
    }
  })

  it('subtraction answers are always positive', () => {
    const rng = seeded(3)
    for (let i = 0; i < RUNS; i++) {
      const p = generateProblem({ op: 'subtract', maxDenominator: 12 }, rng)
      const [x, y] = [value(asMixed(p.a)), value(asMixed(p.b))]
      expect(x.n * y.d - y.n * x.d).toBeGreaterThan(0)
    }
  })

  it('needsRegroup: the first fraction part really is smaller after renaming', () => {
    const rng = seeded(4)
    for (let i = 0; i < RUNS; i++) {
      const p = generateProblem({ op: 'subtract', maxDenominator: 12, needsRegroup: true }, rng)
      const [a, b] = [asMixed(p.a), asMixed(p.b)]
      const l = lcd(a.den, b.den)
      expect(a.num * (l / a.den)).toBeLessThan(b.num * (l / b.den))
      expect(a.whole).toBeGreaterThan(b.whole)
      // The worked steps agree: they contain a regroup step.
      expect(subtractSteps(p.a, p.b).some((s) => s.kind === 'regroup')).toBe(true)
      // Still positive.
      const [x, y] = [value(a), value(b)]
      expect(x.n * y.d - y.n * x.d).toBeGreaterThan(0)
    }
  })

  it('mixed mode makes both kinds and applies needsRegroup to subtraction', () => {
    const rng = seeded(5)
    const ops = new Set<string>()
    for (let i = 0; i < RUNS; i++) {
      const p = generateProblem({ op: 'mixed', maxDenominator: 12, needsRegroup: true }, rng)
      ops.add(p.op)
      if (p.op === 'subtract') {
        expect(subtractSteps(p.a, p.b).some((s) => s.kind === 'regroup')).toBe(true)
      }
    }
    expect(ops).toEqual(new Set(['add', 'subtract']))
  })

  it('is deterministic for the same injected random function', () => {
    const options = { op: 'mixed', maxDenominator: 12 } as const
    expect(generateProblem(options, seeded(9))).toEqual(generateProblem(options, seeded(9)))
  })

  it('terminates and stays valid with extreme random values', () => {
    for (const fixed of [0, 0.999999]) {
      const p = generateProblem({ op: 'subtract', maxDenominator: 12, needsRegroup: true }, () => fixed)
      expect(asMixed(p.a).den).not.toBe(asMixed(p.b).den)
    }
  })

  it('rejects a maxDenominator too small for unlike denominators', () => {
    expect(() => generateProblem({ op: 'add', maxDenominator: 2 })).toThrow(RangeError)
  })
})

describe('describeProblem', () => {
  it('writes the problem without simplifying it', () => {
    expect(
      describeProblem({ op: 'subtract', a: { whole: 8, num: 1, den: 5 }, b: { whole: 4, num: 3, den: 4 } }),
    ).toBe('8 1/5 − 4 3/4')
    expect(
      describeProblem({ op: 'add', a: { whole: 0, num: 2, den: 6 }, b: { whole: 1, num: 1, den: 4 } }),
    ).toBe('2/6 + 1 1/4')
  })
})

describe('answer boxes', () => {
  it('joins boxes into text for checkAnswer', () => {
    expect(boxesToText({ whole: '3', num: '9', den: '20' })).toBe('3 9/20')
    expect(boxesToText({ whole: '', num: '9', den: '20' })).toBe('9/20')
    expect(boxesToText({ whole: '5', num: '', den: '' })).toBe('5')
  })
  it('detects empty and half-filled fractions', () => {
    expect(isAnswerEmpty({ whole: '', num: ' ', den: '' })).toBe(true)
    expect(isFractionIncomplete({ whole: '3', num: '9', den: '' })).toBe(true)
    expect(isFractionIncomplete({ whole: '3', num: '', den: '' })).toBe(false)
  })
})
