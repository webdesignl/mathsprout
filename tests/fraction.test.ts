import { describe, expect, it } from 'vitest'
import {
  add,
  checkAnswer,
  equals,
  isSimplestMixed,
  makeFraction,
  parseMixed,
  simplify,
  subtract,
  toImproper,
  toMixed,
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

describe('checkAnswer', () => {
  const expected = mixed(4, 1, 5)

  it('accepts the simplest mixed form as correct', () => {
    expect(checkAnswer(expected, '4 1/5')).toBe('correct')
  })
  it('flags equal but non-simplest answers', () => {
    expect(checkAnswer(expected, '3 6/5')).toBe('correctNotSimplest')
    expect(checkAnswer(expected, '21/5')).toBe('correctNotSimplest')
    expect(checkAnswer(mixed(2, 3, 4), '2 6/8')).toBe('correctNotSimplest')
  })
  it('marks different values wrong', () => {
    expect(checkAnswer(expected, '4 2/5')).toBe('wrong')
  })
  it('treats division by zero and invalid input as wrong', () => {
    expect(checkAnswer(expected, '1/0')).toBe('wrong')
    expect(checkAnswer(expected, '4 1/0')).toBe('wrong')
    expect(checkAnswer(expected, 'banana')).toBe('wrong')
    expect(checkAnswer(expected, '')).toBe('wrong')
  })
  it('handles whole-number answers', () => {
    expect(checkAnswer({ numerator: 5, denominator: 1 }, '5')).toBe('correct')
    expect(checkAnswer({ numerator: 5, denominator: 1 }, '10/2')).toBe('correctNotSimplest')
  })
})
