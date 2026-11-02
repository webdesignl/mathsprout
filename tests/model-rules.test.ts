import { describe, expect, it } from 'vitest'
import { challengeForRule, deepCheckLink, modelRuleId } from '../app/utils/modelRules'
import { SAMPLES } from '../app/utils/modelSamples'
import type { Plan } from '../app/utils/plan'

describe('modelRuleId', () => {
  it('maps each Tutor plan type to its Deep Check rule', () => {
    expect(SAMPLES.map((s) => modelRuleId(s.plan))).toEqual(['R19', 'R20', 'R21'])
  })

  it('is null for a plan with no model and for no plan', () => {
    const adding: Plan = {
      steps: [
        { op: 'multiply', a: '1/4', b: '1/5', label: 'a' },
        { op: 'multiply', a: '1/2', b: '1/3', label: 'b' },
        { op: 'add', a: 'r1', b: 'r2', label: 'c' },
      ],
    }
    expect(modelRuleId(adding)).toBeNull()
    expect(modelRuleId(null)).toBeNull()
  })
})

describe('links into Deep Check', () => {
  it('finds a challenge for each of the three rules', () => {
    expect(challengeForRule('R19')).toBe('C9')
    expect(challengeForRule('R20')).toBe('C11')
    expect(challengeForRule('R21')).toBe('C13')
    expect(challengeForRule('R1')).toBeNull()
  })

  it('builds the links the Deep Check page reads', () => {
    expect(deepCheckLink('learn', 'R19')).toBe('/deep-check?rule=R19&mode=learn')
    expect(deepCheckLink('quiz', 'R21')).toBe('/deep-check?rule=R21&mode=quiz')
    expect(deepCheckLink('challenge', 'C9')).toBe('/deep-check?challenge=C9')
  })
})
