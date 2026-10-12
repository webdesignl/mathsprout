import { describe, expect, it } from 'vitest'
import {
  MAX_EXAMPLES,
  buildUnlockCards,
  pickRealWorldExamples,
  cleanExamples,
} from '../app/utils/realWorld'
import { withStory } from '../app/utils/stories'
import { formatMixed, subtract, type MixedNumber } from '../app/utils/fraction'
import { generateProblem } from '../app/utils/problems'

const words = (text: string) => text.trim().split(/\s+/).length

describe('cleanExamples', () => {
  it('keeps her ideas as written, apart from tidy spaces', () => {
    expect(cleanExamples(['Cutting a ribbon for a gift', '  Sharing   a pizza with my family '])).toEqual([
      'Cutting a ribbon for a gift',
      'Sharing a pizza with my family',
    ])
  })

  it('caps at 3', () => {
    expect(cleanExamples(['one', 'two', 'three', 'four'])).toHaveLength(MAX_EXAMPLES)
  })

  it('drops blanks and repeats (ignoring case and punctuation)', () => {
    expect(cleanExamples(['', '   ', '!!!'])).toEqual([])
    expect(cleanExamples(['Baking a cake today', 'baking a CAKE today!!'])).toEqual(['Baking a cake today'])
  })

  it('does not judge whether an idea makes sense; a parent does that', () => {
    expect(cleanExamples(['ok'])).toEqual(['ok'])
  })

  it('drops very long text', () => {
    expect(cleanExamples(['word '.repeat(60)])).toEqual([])
  })
})

describe('pickRealWorldExamples / buildUnlockCards', () => {
  it('returns the requested number with no repeats', () => {
    for (const r of [0, 0.3, 0.99]) {
      const cards = pickRealWorldExamples(['add', 'subtract'], 3, [], () => r)
      expect(cards).toHaveLength(3)
      expect(new Set(cards.map((c) => c.text)).size).toBe(3)
      expect(cards.every((c) => !c.mine)).toBe(true)
    }
  })

  it('prefers the story topics she practiced', () => {
    const cards = pickRealWorldExamples(['add'], 2, ['kitchen', 'building'], () => 0)
    expect(cards.map((c) => c.topic).sort()).toEqual(['building', 'kitchen'])
  })

  it('uses ideas for the operations she did', () => {
    const adds = pickRealWorldExamples(['add'], 6, [], () => 0.5)
    expect(adds.every((c) => /add/i.test(c.text))).toBe(true)
    const subs = pickRealWorldExamples(['subtract'], 6, [], () => 0.5)
    expect(subs.every((c) => /subtract|rest|left|remain/i.test(c.text))).toBe(true)
  })

  it('can fill three cards even with no operations given', () => {
    expect(pickRealWorldExamples([], 3, [], () => 0.1)).toHaveLength(3)
  })

  it('every shared idea is short and friendly', () => {
    const all = pickRealWorldExamples(['add', 'subtract'], 100, [], () => 0.5)
    expect(all.length).toBeGreaterThanOrEqual(12)
    for (const c of all) expect(words(c.text)).toBeLessThanOrEqual(22)
  })

  it('puts her ideas first and fills up to three', () => {
    const cards = buildUnlockCards(['Cutting a ribbon for a gift'], ['subtract'], [], () => 0.2)
    expect(cards).toHaveLength(3)
    expect(cards[0]).toMatchObject({ mine: true, topic: 'your idea', text: 'Cutting a ribbon for a gift' })
    expect(cards.slice(1).every((c) => !c.mine)).toBe(true)
  })

  it('gives no shared cards when she has three of her own', () => {
    const cards = buildUnlockCards(['a b c', 'd e f', 'g h i'], ['add'], [], () => 0)
    expect(cards).toHaveLength(3)
    expect(cards.every((c) => c.mine)).toBe(true)
  })
})

describe('withStory', () => {
  it('keeps the numbers and puts them in the story', () => {
    const problem = { op: 'subtract', a: { whole: 8, num: 1, den: 5 }, b: { whole: 4, num: 3, den: 4 } } as const
    const story = withStory(problem, () => 0)
    expect(story.op).toBe('subtract')
    expect(story.a).toEqual(problem.a)
    expect(story.b).toEqual(problem.b)
    expect(story.story).toContain('8 1/5')
    expect(story.story).toContain('4 3/4')
    expect(story.story).not.toContain('{')
    expect(story.topic).toBeTruthy()
  })

  it('every template, for both operations, fills in both numbers and asks a question', () => {
    for (const op of ['add', 'subtract'] as const) {
      const seen = new Set<string>()
      for (let i = 0; i < 40; i++) {
        const p = withStory(generateProblem({ op, maxDenominator: 12 }, () => (i % 10) / 10 + 0.01), () => i / 40)
        const [a, b] = [p.a as MixedNumber, p.b as MixedNumber]
        expect(p.story).not.toMatch(/[{}]/)
        expect(p.story).toContain(`${a.num}/${a.den}`)
        expect(p.story).toContain(`${b.num}/${b.den}`)
        expect(p.story).toMatch(/\?$/)
        seen.add(p.topic!)
      }
      expect(seen.size).toBe(4)
    }
  })

  it('subtraction stories always take the smaller amount away (answers stay positive)', () => {
    for (let i = 0; i < 100; i++) {
      const p = withStory(generateProblem({ op: 'subtract', maxDenominator: 12 }, () => (i * 7919 % 1000) / 1000), () => 0.3)
      expect(subtract(p.a, p.b).numerator).toBeGreaterThan(0)
      expect(formatMixed(subtract(p.a, p.b))).toBeTruthy()
    }
  })
})
