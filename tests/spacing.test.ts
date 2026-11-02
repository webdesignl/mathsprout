import { describe, expect, it } from 'vitest'
import { formatMixed } from '../app/utils/fraction'
import { resolvePlan, similarPlan, type SpacingSpec } from '../app/utils/plan'
import { buildSpacingPlan, ordinal, pluralOf } from '../app/utils/spacing'
import { readProblem } from '../server/utils/tutor/read'
import { fakeClient } from './tutor-helpers'

/** Original: lanterns in a row. The 2nd to the 5th is 2 1/4 m apart; the 2nd to the last is 12 3/4 m. */
const LANTERNS: SpacingSpec = {
  thing: 'lantern',
  unit: 'm',
  near: { from: '2', to: '5', distance: '2 1/4' },
  far: { from: '2', distance: '12 3/4' },
}
/** Original: poles 2 1/2 m apart along a track of 20 m, the first pole at the start. */
const POLES: SpacingSpec = { thing: 'pole', unit: 'm', gap: '2 1/2', far: { from: '1', distance: '20' } }

describe('buildSpacingPlan', () => {
  it('counts gaps, finds one gap, counts the far gaps, then the number of the last one', () => {
    const built = buildSpacingPlan(LANTERNS)!
    expect(built.plan.steps.map((s) => s.op)).toEqual(['subtract', 'divide', 'divide', 'add'])
    const check = resolvePlan(built.plan)
    // 5 - 2 = 3 gaps; 2 1/4 / 3 = 3/4; 12 3/4 / 3/4 = 17 gaps; 2 + 17 = 19.
    expect(check.ok && check.results.map((r) => formatMixed(r))).toEqual(['3', '3/4', '17', '19'])
    expect(built.gaps).toBe(17)
    expect(built.last).toBe(19)
    expect(built.stages).toHaveLength(4)
  })

  it('handles a known gap that starts at the first one, where the answer is gaps + 1', () => {
    const built = buildSpacingPlan(POLES)!
    const check = resolvePlan(built.plan)
    expect(check.ok && check.results.map((r) => formatMixed(r))).toEqual(['8', '9'])
    expect(built.plan.steps[1]!.label).toBe('How many poles are there in all?')
    expect(built.stages.at(-1)!.caption).toContain('8 + 1 = 9')
    expect(built.stages).toHaveLength(2)
  })

  it('never shows the answer before its step: only the final stage has the last dot', () => {
    const built = buildSpacingPlan(LANTERNS)!
    for (const stage of [built.given, ...built.stages.slice(0, -1)]) {
      expect(stage.dots.some((d) => d.at === built.last)).toBe(false)
      expect(stage.caption).not.toContain('19')
    }
    expect(built.stages.at(-1)!.dots.some((d) => d.at === built.last && d.tone === 1)).toBe(true)
    expect(built.stages.slice(0, -1).every((s) => s.open)).toBe(true)
  })

  it('warns about the usual slips without giving the answer', () => {
    const built = buildSpacingPlan(LANTERNS)!
    const finalStep = built.plan.steps.length - 1
    expect(built.nudges.find((n) => n.step === 0)!.wrong).toBe('4')
    expect(built.nudges.filter((n) => n.step === finalStep).map((n) => n.wrong).sort()).toEqual(['17', '18'])
    for (const n of built.nudges) expect(n.message).not.toMatch(/\b(17|18|19|3\/4)\b/)
    expect(buildSpacingPlan(POLES)!.nudges.map((n) => n.wrong)).toEqual(['8'])
  })

  it('keeps the answer out of every step question', () => {
    const labels = buildSpacingPlan(LANTERNS)!.plan.steps.map((s) => s.label)
    expect(labels.some((l) => /19th|17 |3\/4/.test(l))).toBe(false)
  })

  it('refuses a problem whose gaps do not fit a whole number of times', () => {
    expect(buildSpacingPlan({ ...LANTERNS, far: { from: '2', distance: '12 1/2' } })).toBeNull()
    expect(buildSpacingPlan({ ...POLES, far: { from: '1', distance: '21' } })).toBeNull()
  })

  it('refuses bad numbers', () => {
    expect(buildSpacingPlan({ ...LANTERNS, near: { from: '5', to: '2', distance: '2 1/4' } })).toBeNull()
    expect(buildSpacingPlan({ ...LANTERNS, near: { from: '2', to: '5', distance: '0' } })).toBeNull()
    expect(buildSpacingPlan({ ...POLES, gap: '0' })).toBeNull()
    expect(buildSpacingPlan({ ...POLES, far: { from: '0', distance: '20' } })).toBeNull()
    expect(buildSpacingPlan({ ...POLES, far: { from: '1', distance: '500' } })).toBeNull()
    expect(buildSpacingPlan({ ...POLES, thing: ' ' })).toBeNull()
  })

  it('is not used to make a similar problem', () => {
    expect(similarPlan(buildSpacingPlan(LANTERNS)!.plan)).toBeNull()
  })
})

describe('words', () => {
  it('writes ordinals and plurals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 112].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '112th'])
    expect([pluralOf('balloon'), pluralOf('bench'), pluralOf('cherry'), pluralOf('toy')]).toEqual(['balloons', 'benches', 'cherries', 'toys'])
  })
})

describe('reading a things-in-a-row problem', () => {
  it('builds the plan in code from the shape', async () => {
    const reply = JSON.stringify({ spacing: LANTERNS, problemText: 'A lantern story.', confidence: 'high' })
    const { client } = fakeClient(reply)
    const result = await readProblem(client, { text: 'x' })
    expect(result).toMatchObject({ ok: true, plan: { steps: [{}, {}, {}, {}], spacing: { thing: 'lantern' } } })
  })

  it('refuses a reply whose gaps do not fit', async () => {
    const reply = JSON.stringify({ spacing: { ...LANTERNS, far: { from: '2', distance: '12 1/2' } }, problemText: 'x', confidence: 'high' })
    const { client } = fakeClient(reply, reply)
    const result = await readProblem(client, { text: 'x' })
    expect(result.ok).toBe(false)
  })
})
