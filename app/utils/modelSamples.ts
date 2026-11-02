import { buildBarStages, stageAt, type BarStage } from './fractionBar'
import { buildRatePlan } from './rateBar'
import { buildUnitPlan } from './unitBar'
import type { Plan } from './plan'

/**
 * Original sample problems for the three word-problem models. The Deep Check rules show their pictures,
 * and the developer preview page steps through them. Every picture is built by code from these numbers.
 */
export type ModelSample = 'rest' | 'unit' | 'rate'

export interface SampleProblem {
  id: ModelSample
  title: string
  story: string
  plan: Plan
  stages: BarStage[] | null
}

const REST_PLAN: Plan = {
  whole: 'the books',
  steps: [
    { op: 'subtract', a: '1', b: '3/4', label: 'What fraction of the books are not story books?', bName: 'story books', name: 'not story books' },
    { op: 'multiply', a: 'r1', b: '1/3', label: 'What fraction of all the books are about animals?', name: 'about animals' },
  ],
}

const UNIT = buildUnitPlan(
  {
    groups: [{ takes: [{ share: '1/3', name: 'bike' }] }, { takes: [{ share: '1/4', name: 'books' }, { share: '1/8', name: 'snacks' }] }],
    left: { amount: '60', unit: '$', name: 'kept' },
  },
  'her savings',
)!

const RATE = buildRatePlan({ first: { days: '4', left: '3/4' }, second: { days: '3', amountLeft: '2 1/2' }, unit: 'hours' }, 'the battery')!

export const SAMPLES: SampleProblem[] = [
  {
    id: 'rest',
    title: 'Part of the rest',
    story:
      'A library has some books. 3/4 of them are story books. 1/3 of the books that are not story books are about animals. What fraction of all the books are about animals?',
    plan: REST_PLAN,
    stages: buildBarStages(REST_PLAN),
  },
  {
    id: 'unit',
    title: 'Work backwards (unit bar)',
    story: 'Mia spent 1/3 of her savings on a bike. Of what was left she spent 1/4 on books and 1/8 on snacks. She had $60 left. How much were her savings at first?',
    plan: UNIT.plan,
    stages: UNIT.stages,
  },
  {
    id: 'rate',
    title: 'Same amount each day (day strip)',
    story:
      'A battery runs a lamp the same number of hours each day. 3/4 of the charge is left after 4 days. After 3 more days, 2 1/2 hours of light are left. How many hours of light did the full battery give?',
    plan: RATE.plan,
    stages: RATE.stages,
  },
]

export function sampleOf(id: ModelSample): SampleProblem {
  return SAMPLES.find((s) => s.id === id)!
}

/** The picture of a sample after the given step has been answered (null if there is none yet). */
export function modelStage(id: ModelSample, step: number): BarStage | null {
  const stages = sampleOf(id).stages
  return stages ? stageAt(stages, step) : null
}
