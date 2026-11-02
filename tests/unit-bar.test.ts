import { describe, expect, it } from 'vitest'
import { formatMixed, toMixed } from '../app/utils/fraction'
import { resolvePlan, similarPlan, type UnitSpec } from '../app/utils/plan'
import { buildUnitPlan, withUnit } from '../app/utils/unitBar'
import { stageAt } from '../app/utils/fractionBar'
import { readProblem } from '../server/utils/tutor/read'
import { modelReadSchema } from '../server/utils/tutor/schemas'
import { fakeClient } from './tutor-helpers'

/** Original: Mia spends 1/3 on a bike; of the rest, 1/4 on books and 1/8 on snacks; $60 is left. */
const MIA: UnitSpec = {
  groups: [
    { takes: [{ share: '1/3', name: 'bike' }] },
    { takes: [{ share: '1/4', name: 'books' }, { share: '1/8', name: 'snacks' }] },
  ],
  left: { amount: '60', unit: '$', name: 'kept' },
}

describe('buildUnitPlan', () => {
  it('turns the problem into engine-checked steps and works out the whole', () => {
    const built = buildUnitPlan(MIA, 'her savings')!
    expect(built.plan.steps.map((s) => s.op)).toEqual(['subtract', 'add', 'subtract', 'multiply', 'divide'])
    const check = resolvePlan(built.plan)
    expect(check.ok && check.results.map((r) => formatMixed(r))).toEqual(['2/3', '3/8', '5/8', '5/12', '144'])
    expect(formatMixed(toMixed(built.total))).toBe('144')
    // No step label carries a digit or an answer.
    expect(built.plan.steps.every((s) => !/\d/.test(s.label))).toBe(true)
  })

  it('draws the unit bar: 12 units, 5 of them worth $60, so 1 unit is $12 and the whole is $144', () => {
    const stages = buildUnitPlan(MIA, 'her savings')!.stages!
    expect(stages).toHaveLength(3)
    expect(stages.map((s) => s.step)).toEqual([0, 3, 4])
    expect(stages[0]!.after.cells).toBe(3)
    expect(stages[1]!.after.cells).toBe(12)
    const marks = stages[1]!.after.marks.slice(-3).map((m) => [m.start, m.count, m.label])
    expect(marks).toEqual([[4, 2, 'books'], [6, 1, 'snacks'], [7, 5, 'kept']])
    expect(stages[2]!.after.marks.some((m) => m.label === '1 unit = $12')).toBe(true)
    expect(stages[2]!.whole).toBe('her savings = $144')
    // The answer only appears in the last stage, shown after the last step.
    expect(stageAt(stages, 2)!.whole).toBe('her savings: ?')
  })

  it('handles one group', () => {
    const one: UnitSpec = { groups: [{ takes: [{ share: '1/4' }, { share: '1/5' }] }], left: { amount: '11' } }
    const built = buildUnitPlan(one)!
    expect(formatMixed(toMixed(built.total))).toBe('20')
    expect(built.stages!.at(-1)!.after.cells).toBe(20)
  })

  it('rejects shapes it cannot do exactly', () => {
    expect(buildUnitPlan({ ...MIA, left: { amount: '0' } })).toBeNull()
    expect(buildUnitPlan({ groups: [{ takes: [{ share: '3/4' }, { share: '1/2' }] }], left: { amount: '5' } })).toBeNull()
    expect(buildUnitPlan({ groups: [{ takes: [{ share: 'x' }] }], left: { amount: '5' } })).toBeNull()
  })

  it('does not crash on a group list with a hole in it', () => {
    const sparse = { ...MIA, groups: [MIA.groups[0]!, undefined as never] }
    expect(buildUnitPlan(sparse)).toBeNull()
    expect(buildUnitPlan({ ...MIA, groups: [{ takes: undefined as never }] })).toBeNull()
  })

  it('offers no similar problem for a unit-bar plan', () => {
    expect(similarPlan(buildUnitPlan(MIA)!.plan)).toBeNull()
  })

  it('puts money before the number and other units after', () => {
    expect(withUnit('5', '$')).toBe('$5')
    expect(withUnit('5', 'cm')).toBe('5 cm')
  })
})

describe('reading an unknown-whole problem', () => {
  it('builds the plan in code from the shapes the model returns', async () => {
    const reply = JSON.stringify({ unknownTotal: MIA, problemText: 'A savings story.', confidence: 'high' })
    const { client } = fakeClient(reply)
    const result = await readProblem(client, { text: 'x' })
    expect(result).toMatchObject({ ok: true, plan: { steps: [{}, {}, {}, {}, {}], whole: 'the whole' } })
  })
})

describe('the model reply is checked early', () => {
  const reply = (share: string, amount: string) => ({
    unknownTotal: { groups: [{ takes: [{ share }] }], left: { amount } },
    problemText: 'x',
    confidence: 'high',
  })
  it('accepts a proper fraction share and a positive amount, with spaces around them', () => {
    expect(modelReadSchema.safeParse(reply('1/4', '250')).success).toBe(true)
    expect(modelReadSchema.safeParse(reply(' 3/5 ', ' 4 2/3 ')).success).toBe(true)
  })
  it('refuses a share that is not a proper fraction and an amount that is not above zero', () => {
    expect(modelReadSchema.safeParse(reply('3/2', '250')).success).toBe(false)
    expect(modelReadSchema.safeParse(reply('1/0', '250')).success).toBe(false)
    expect(modelReadSchema.safeParse(reply('one quarter', '250')).success).toBe(false)
    expect(modelReadSchema.safeParse(reply('1/4', '0')).success).toBe(false)
    expect(modelReadSchema.safeParse(reply('1/4', 'lots')).success).toBe(false)
  })
})
