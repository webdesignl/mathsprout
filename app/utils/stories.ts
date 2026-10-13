import type { AnyOp, AnyProblem, MixedNumber } from './fraction'

/** Where a story happens. Also used to pick real-world ideas at the end of a set. */
export type Topic = 'kitchen' | 'building' | 'sport' | 'art'

/** A practice problem, optionally wrapped in a short story. The numbers and the answer don't change. */
export type PracticeProblem = AnyProblem & {
  story?: string
  topic?: Topic
  /** Why this operation fits the story. */
  why?: string
}

type Random = () => number

interface Template {
  topic: Topic
  /** {a} and {b} become the two mixed numbers. */
  text: string
  /** Why this operation fits the story, for the Learn panel. */
  why: string
}

// All stories are original. They are short, use no names, and read well with fractions.
const TEMPLATES: Record<AnyOp, Template[]> = {
  add: [
    {
      topic: 'kitchen',
      text: 'A recipe uses {a} cups of flour for the dough and {b} cups for the topping. How many cups of flour in all?',
      why: 'The flour for the dough and the flour for the topping are put together, so we add.',
    },
    {
      topic: 'building',
      text: 'One board is {a} meters long and another is {b} meters long. Laid end to end, how long are they?',
      why: 'Two boards are laid end to end, so their lengths are put together. We add.',
    },
    {
      topic: 'sport',
      text: 'A team ran {a} kilometers before lunch and {b} kilometers after. How far did they run in all?',
      why: 'The distance before lunch and the distance after lunch are put together. We add.',
    },
    {
      topic: 'art',
      text: 'An artist mixes {a} liters of blue paint with {b} liters of yellow paint. How much green paint is that?',
      why: 'Two paints are mixed into one, so the amounts are put together. We add.',
    },
  ],
  subtract: [
    {
      topic: 'kitchen',
      text: 'A jug has {a} liters of juice. {b} liters are poured out. How many liters are left?',
      why: 'Some juice is poured out and we want what is left. We subtract.',
    },
    {
      topic: 'building',
      text: 'A rope is {a} meters long. A piece {b} meters long is cut off. How long is the rest?',
      why: 'A piece is cut off and we want the rest. We subtract.',
    },
    {
      topic: 'sport',
      text: 'A trail is {a} kilometers long. A hiker has walked {b} kilometers. How much farther is there to go?',
      why: 'The hiker has walked part of the trail and we want how much is left to go. We subtract.',
    },
    {
      topic: 'art',
      text: 'A roll of ribbon is {a} meters long. A crafter uses {b} meters for a bow. How much ribbon is left?',
      why: 'Some ribbon is used and we want what is left. We subtract.',
    },
  ],
  // For multiplying, {a} is how many and {b} is how much each. For dividing, {a} is the total and {b} is the size of each part.
  multiply: [
    { topic: 'kitchen', text: 'One batch of muffins uses {b} cups of flour. How many cups do you need for {a} batches?', why: 'Each batch uses the same amount of flour, so that amount repeats for every batch. We multiply.',
    },
    { topic: 'building', text: 'Each shelf needs a board {b} meters long. How many meters of board for {a} shelves?', why: 'Every shelf needs the same length of board, so that length repeats for each shelf. We multiply.',
    },
    { topic: 'sport', text: 'A runner goes {b} kilometers each day. How far is that in {a} days?', why: 'The runner goes the same distance each day, so that distance repeats for each day. We multiply.',
    },
    { topic: 'art', text: 'One painting uses {b} liters of paint. How much paint do {a} paintings use?', why: 'Every painting uses the same amount of paint, so that amount repeats for each painting. We multiply.',
    },
  ],
  divide: [
    { topic: 'kitchen', text: 'A bag has {a} cups of rice. Each serving uses {b} cups. How many servings is that?', why: 'We want to know how many servings fit in the bag, so we split the rice into equal servings. We divide.',
    },
    { topic: 'building', text: 'A rope is {a} meters long. It is cut into pieces {b} meters long. How many pieces is that?', why: 'The rope is cut into equal pieces and we want how many pieces. We divide.',
    },
    { topic: 'sport', text: 'A trail is {a} kilometers long. A hiker walks {b} kilometers each hour. How many hours does it take?', why: 'We want how many hours of walking fit in the trail, so we split the trail into equal hourly parts. We divide.',
    },
    { topic: 'art', text: '{a} liters of paint fill jars that each hold {b} liters. How many jars is that?', why: 'The paint is shared into equal jars and we want how many jars. We divide.',
    },
  ],
}

function written(m: MixedNumber): string {
  if (m.num === 0) return String(m.whole)
  return m.whole === 0 ? `${m.num}/${m.den}` : `${m.whole} ${m.num}/${m.den}`
}

/** Wraps a generated problem in a story. Subtraction stories always take the smaller amount away; division stories ask "how many". */
export function withStory(problem: AnyProblem, rng: Random = Math.random): PracticeProblem {
  const options = TEMPLATES[problem.op]
  const template = options[Math.min(Math.floor(rng() * options.length), options.length - 1)]!
  const a = problem.a as MixedNumber
  const b = problem.b as MixedNumber
  return {
    ...problem,
    topic: template.topic,
    why: template.why,
    story: template.text.replace('{a}', written(a)).replace('{b}', written(b)),
  }
}
