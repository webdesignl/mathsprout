import type { AnyOp, AnyProblem, MixedNumber } from './fraction'

/** Where a story happens. Also used to pick real-world ideas at the end of a set. */
export type Topic = 'kitchen' | 'building' | 'sport' | 'art'

/** A practice problem, optionally wrapped in a short story. The numbers and the answer don't change. */
export type PracticeProblem = AnyProblem & {
  story?: string
  topic?: Topic
}

type Random = () => number

interface Template {
  topic: Topic
  /** {a} and {b} become the two mixed numbers. */
  text: string
}

// All stories are original. They are short, use no names, and read well with fractions.
const TEMPLATES: Record<AnyOp, Template[]> = {
  add: [
    {
      topic: 'kitchen',
      text: 'A recipe uses {a} cups of flour for the dough and {b} cups for the topping. How many cups of flour in all?',
    },
    {
      topic: 'building',
      text: 'One board is {a} meters long and another is {b} meters long. Laid end to end, how long are they?',
    },
    {
      topic: 'sport',
      text: 'A team ran {a} kilometers before lunch and {b} kilometers after. How far did they run in all?',
    },
    {
      topic: 'art',
      text: 'An artist mixes {a} liters of blue paint with {b} liters of yellow paint. How much green paint is that?',
    },
  ],
  subtract: [
    {
      topic: 'kitchen',
      text: 'A jug has {a} liters of juice. {b} liters are poured out. How many liters are left?',
    },
    {
      topic: 'building',
      text: 'A rope is {a} meters long. A piece {b} meters long is cut off. How long is the rest?',
    },
    {
      topic: 'sport',
      text: 'A trail is {a} kilometers long. A hiker has walked {b} kilometers. How much farther is there to go?',
    },
    {
      topic: 'art',
      text: 'A roll of ribbon is {a} meters long. A crafter uses {b} meters for a bow. How much ribbon is left?',
    },
  ],
  // For multiplying, {a} is how many and {b} is how much each. For dividing, {a} is the total and {b} is the size of each part.
  multiply: [
    { topic: 'kitchen', text: 'One batch of muffins uses {b} cups of flour. How many cups do you need for {a} batches?' },
    { topic: 'building', text: 'Each shelf needs a board {b} meters long. How many meters of board for {a} shelves?' },
    { topic: 'sport', text: 'A runner goes {b} kilometers each day. How far is that in {a} days?' },
    { topic: 'art', text: 'One painting uses {b} liters of paint. How much paint do {a} paintings use?' },
  ],
  divide: [
    { topic: 'kitchen', text: 'A bag has {a} cups of rice. Each serving uses {b} cups. How many servings is that?' },
    { topic: 'building', text: 'A rope is {a} meters long. It is cut into pieces {b} meters long. How many pieces is that?' },
    { topic: 'sport', text: 'A trail is {a} kilometers long. A hiker walks {b} kilometers each hour. How many hours does it take?' },
    { topic: 'art', text: '{a} liters of paint fill jars that each hold {b} liters. How many jars is that?' },
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
    story: template.text.replace('{a}', written(a)).replace('{b}', written(b)),
  }
}
