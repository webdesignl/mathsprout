import { describe, expect, it } from 'vitest'
import { formatMixed, toMixed } from '../app/utils/fraction'
import { resolvePlan, similarPlan, type RateSpec } from '../app/utils/plan'
import { buildRatePlan } from '../app/utils/rateBar'
import { stageAt } from '../app/utils/fractionBar'
import { readProblem } from '../server/utils/tutor/read'
import { fakeClient } from './tutor-helpers'

/** Original: a battery runs a lamp the same amount each day. 3/4 is left after 4 days; 2 1/2 hours of light are left after 3 more. */
const LAMP: RateSpec = { first: { days: '4', left: '3/4' }, second: { days: '3', amountLeft: '2 1/2' }, unit: 'hours' }
/** Tests the same shape as the homework: 3/5 left after 6 days, 4 2/3 left after 5 more. */
const OIL: RateSpec = { first: { days: '6', left: '3/5' }, second: { days: '5', amountLeft: '4 2/3' }, unit: 'litres' }

describe('buildRatePlan', () => {
  it('builds the six steps in a child’s order and the engine agrees with each', () => {
    const built = buildRatePlan(OIL, 'the oil')!
    expect(built.plan.steps.map((s) => s.op)).toEqual(['subtract', 'divide', 'add', 'subtract', 'divide', 'multiply'])
    const check = resolvePlan(built.plan)
    expect(check.ok && check.results.map((r) => formatMixed(r))).toEqual(['2/5', '15', '11', '4', '1 1/6', '17 1/2'])
    expect(formatMixed(toMixed(built.total))).toBe('17 1/2')
    expect(built.days).toBe(15)
    expect(built.plan.steps.every((s) => !/\d/.test(s.label))).toBe(true)
  })

  it('works for a different original problem', () => {
    const built = buildRatePlan(LAMP, 'the battery')!
    // used 1/4 in 4 days -> 16 days in all; day 7; 9 days left; 2 1/2 over 9 days is 5/18 a day; 16 days make 4 4/9.
    expect(built.days).toBe(16)
    expect(formatMixed(toMixed(built.total))).toBe('4 4/9')
  })

  it('draws a strip of days, one stage per step, and the whole appears only at the end', () => {
    const stages = buildRatePlan(OIL, 'the oil')!.stages!
    expect(stages.map((s) => s.step)).toEqual([0, 1, 2, 3, 4, 5])
    expect(stages[0]!.after.cells).toBe(5)
    expect(stages[1]!.after.cells).toBe(15)
    expect(stages[2]!.after.marks.at(-1)).toMatchObject({ start: 6, count: 5 })
    expect(stages[3]!.after.marks.at(-1)).toMatchObject({ start: 11, count: 4 })
    expect(stages[4]!.after.marks.at(-1)!.label).toBe('1 day = 1 1/6 litres')
    expect(stages[5]!.whole).toBe('the oil = 17 1/2 litres')
    expect(stageAt(stages, 4)!.whole).toBe('the oil: 15 days to use it all')
    expect(stages.slice(0, 5).every((s) => !s.whole.includes('17'))).toBe(true)
  })

  it('rejects shapes that do not work out', () => {
    // 6 days for 1/2 gives 12 days, but 7 + 6 days is more than that.
    expect(buildRatePlan({ first: { days: '6', left: '1/2' }, second: { days: '7', amountLeft: '2' } })).toBeNull()
    // 5 days for 2/3 used is 7 1/2 days, not a whole number of days.
    expect(buildRatePlan({ first: { days: '5', left: '1/3' }, second: { days: '1', amountLeft: '2' } })).toBeNull()
    expect(buildRatePlan({ first: { days: 'x', left: '1/2' }, second: { days: '1', amountLeft: '2' } })).toBeNull()
    expect(buildRatePlan({ first: { days: '6', left: '3/2' }, second: { days: '1', amountLeft: '2' } })).toBeNull()
  })

  it('offers no similar problem', () => {
    expect(similarPlan(buildRatePlan(OIL)!.plan)).toBeNull()
  })
})

describe('reading a same-amount problem', () => {
  it('builds the plan in code from the shape', async () => {
    const reply = JSON.stringify({ sameRate: { whole: 'the oil', ...OIL }, problemText: 'A kitchen story.', confidence: 'high' })
    const { client } = fakeClient(reply)
    const result = await readProblem(client, { text: 'x' })
    expect(result).toMatchObject({ ok: true, plan: { steps: [{}, {}, {}, {}, {}, {}], whole: 'the oil' } })
  })
})
