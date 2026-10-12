import type { Op } from './fraction'
import type { Topic } from './stories'

type Random = () => number

export const MAX_EXAMPLES = 3

/** A knowledge card she unlocks at the end of a set. */
export interface UnlockCard {
  topic: Topic | 'time' | 'shopping' | 'your idea'
  text: string
  /** True for her own ideas, false for ideas the app shares. */
  mine: boolean
}

interface Idea {
  topic: Exclude<UnlockCard['topic'], 'your idea'>
  text: string
}

// Original, short examples of where adding and subtracting fractions shows up in real life.
const IDEAS: Record<Op, Idea[]> = {
  add: [
    { topic: 'kitchen', text: 'Bakers add 1 1/2 cups of flour and 3/4 cup more to double a recipe.' },
    { topic: 'building', text: 'Builders add 2 1/2 feet and 1 3/4 feet to cut a board the right length.' },
    { topic: 'sport', text: 'Runners add 3/4 mile and 1 1/2 miles to know their whole training run.' },
    { topic: 'art', text: 'Painters add 1/3 liter of blue and 1/2 liter of yellow to mix green.' },
    { topic: 'time', text: 'You add 3/4 hour of reading and 1 1/2 hours of games to see your screen time.' },
    { topic: 'shopping', text: 'Shoppers add 1 1/4 kilos of apples and 2 1/2 kilos of oranges to find the total weight.' },
  ],
  subtract: [
    { topic: 'kitchen', text: 'Cooks subtract what they used from 2 1/2 cups of sugar to see what is left.' },
    { topic: 'building', text: 'Carpenters subtract a 1 3/4 foot piece from a 6 foot board to see the rest.' },
    { topic: 'sport', text: 'Hikers subtract the 3 1/2 miles they walked from a 5 mile trail to see what remains.' },
    { topic: 'art', text: 'Crafters subtract the ribbon they used to know how much is left for the next gift.' },
    { topic: 'time', text: 'You subtract 2/3 hour of homework from 1 1/2 hours to see your free time.' },
    { topic: 'shopping', text: 'Shoppers subtract 3/4 kilo from a 2 kilo bag to see how much they have left.' },
  ],
}

const normalize = (text: string) => text.trim().replace(/\s+/g, ' ')

/**
 * Tidies her ideas before a parent sees them: extra spaces removed, blanks and repeats dropped,
 * at most 3. Code does not judge whether an idea makes sense; a parent gives the stars.
 */
export function cleanExamples(inputs: string[]): string[] {
  const seen = new Set<string>()
  const cleaned: string[] = []
  for (const raw of inputs) {
    const text = normalize(raw)
    const key = text.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '')
    if (key === '' || text.length > 200 || seen.has(key)) continue
    seen.add(key)
    cleaned.push(text)
    if (cleaned.length === MAX_EXAMPLES) break
  }
  return cleaned
}

/**
 * Ideas the app shares so she always ends up with three cards. Prefers ideas that match the
 * operations (and, when given, the story topics) she practiced, and never repeats an idea.
 */
export function pickRealWorldExamples(
  ops: Op[],
  count: number,
  topics: string[] = [],
  rng: Random = Math.random,
): UnlockCard[] {
  const pool: Idea[] = []
  for (const op of ops.length > 0 ? ops : (['add', 'subtract'] as Op[])) pool.push(...IDEAS[op])

  const remaining = [...pool].sort((x, y) => Number(topics.includes(y.topic)) - Number(topics.includes(x.topic)))
  const picked: UnlockCard[] = []
  while (picked.length < count && remaining.length > 0) {
    // Topic matches come first, with a little shuffling inside each group.
    const group = remaining.filter((i) => topics.includes(i.topic) === topics.includes(remaining[0]!.topic))
    const idea = group[Math.min(Math.floor(rng() * group.length), group.length - 1)]!
    remaining.splice(remaining.indexOf(idea), 1)
    picked.push({ topic: idea.topic, text: idea.text, mine: false })
  }
  return picked
}

/** Cards for the reveal: her ideas first, then ideas from the app to fill up to three. */
export function buildUnlockCards(
  mine: string[],
  ops: Op[],
  topics: string[] = [],
  rng: Random = Math.random,
): UnlockCard[] {
  const own: UnlockCard[] = mine.map((text) => ({ topic: 'your idea', text, mine: true }))
  return [...own, ...pickRealWorldExamples(ops, MAX_EXAMPLES - own.length, topics, rng)]
}
