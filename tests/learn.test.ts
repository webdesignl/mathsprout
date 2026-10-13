import { describe, expect, it } from 'vitest'
import { diagnose, type Problem } from '../app/utils/fraction'
import { buildLearn } from '../app/utils/learn'
import {
  GENERIC_STEP_HINT,
  SLIP_NUDGES,
  NOT_SIMPLEST_MESSAGE,
  STEP_HINTS,
  SUCCESS_MESSAGES,
  WRONG_MESSAGES,
  pickDifferent,
  proofHint,
  slipName,
} from '../app/utils/messages'

const sub: Problem = { op: 'subtract', a: { whole: 8, num: 1, den: 5 }, b: { whole: 4, num: 3, den: 4 } }
const words = (text: string) => text.trim().split(/\s+/).length

describe('buildLearn (the Learn panel content)', () => {
  it('highlights the step diagnose points at for 8 1/5 − 4 3/4 with 3 11/20', () => {
    const learn = buildLearn(sub, '3 11/20')
    const diagnosis = diagnose(sub, '3 11/20')
    expect(diagnosis.slip).toBe('numeratorArithmetic')
    expect(learn.highlightIndex).toBe(diagnosis.stepIndex)
    expect(learn.steps[learn.highlightIndex!]!.step.kind).toBe('subtractNumerators')
    expect(learn.steps.filter((s) => s.highlighted)).toHaveLength(1)
    expect(learn.steps[learn.highlightIndex!]!.note).toBe(
      'Your answer matches until here. 24 − 15 = 9, but your answer used 11.',
    )
    expect(learn.intro).toBe('That looks like a subtracting slip.')
  })

  it('shows the full correct method from the engine, in order', () => {
    const learn = buildLearn(sub, '3 11/20')
    expect(learn.steps.map((s) => s.step.kind)).toEqual([
      'rename',
      'regroup',
      'subtractWholes',
      'subtractNumerators',
      'answer',
    ])
    expect(learn.steps[1]!.step.expression).toBe('7 24/20 - 4 15/20')
  })

  it('names a forgotten regroup kindly and points at the regroup step', () => {
    const learn = buildLearn(sub, '4 11/20')
    expect(learn.slip).toBe('forgotRegroup')
    expect(learn.steps[learn.highlightIndex!]!.step.kind).toBe('regroup')
    expect(learn.intro).toBe('That looks like a borrowing slip.')
  })

  it('points at the whole-number step for a whole-number slip', () => {
    const learn = buildLearn(sub, '4 9/20')
    expect(learn.slip).toBe('wholeArithmetic')
    expect(learn.steps[learn.highlightIndex!]!.step.kind).toBe('subtractWholes')
    expect(learn.steps[learn.highlightIndex!]!.note).toContain('7 − 4 = 3, but your answer used 4')
  })

  it('points at the rename step when denominators were added', () => {
    const add: Problem = { op: 'add', a: { whole: 0, num: 1, den: 5 }, b: { whole: 0, num: 3, den: 4 } }
    const learn = buildLearn(add, '4/9')
    expect(learn.slip).toBe('addedDenominators')
    expect(learn.steps[learn.highlightIndex!]!.step.kind).toBe('rename')
  })

  it('names mixing up the operation kindly, with no step highlighted', () => {
    const learn = buildLearn(sub, '12 19/20')
    expect(learn.slip).toBe('wrongOperation')
    expect(learn.highlightIndex).toBeNull()
    expect(learn.intro).toBe('That looks like using the other operation.')
    expect(learn.steps.length).toBeGreaterThan(0)
  })

  it('highlights nothing when it cannot tell what went wrong', () => {
    const learn = buildLearn(sub, '17')
    expect(learn.highlightIndex).toBeNull()
    expect(learn.intro).toBeNull()
    expect(learn.steps.every((s) => !s.highlighted && s.note === null)).toBe(true)
  })

  it('still shows the method when there is no answer to compare', () => {
    const learn = buildLearn(sub, '')
    expect(learn.highlightIndex).toBeNull()
    expect(learn.steps.length).toBeGreaterThan(0)
  })
})

describe('messages', () => {
  it('pickDifferent never returns the last item', () => {
    for (const last of SUCCESS_MESSAGES) {
      for (const r of [0, 0.25, 0.5, 0.99]) {
        expect(pickDifferent(SUCCESS_MESSAGES, last, () => r)).not.toBe(last)
      }
    }
  })

  it('falls back gracefully with a one-item list', () => {
    expect(pickDifferent(['Only'], 'Only')).toBe('Only')
  })

  it('every message is one short sentence of about 12 words or fewer', () => {
    const all = [
      ...SUCCESS_MESSAGES,
      ...WRONG_MESSAGES,
      NOT_SIMPLEST_MESSAGE,
      GENERIC_STEP_HINT,
      ...Object.values(STEP_HINTS),
      ...Object.values(SLIP_NUDGES),
      proofHint('subtract', '4 3/4'),
      proofHint('add', '2 5/12'),
    ]
    for (const message of all) expect(words(message)).toBeLessThanOrEqual(12)
  })

  it('every engine hint is one short question', () => {
    for (const input of ['3 11/20', '4 11/20', '4 9/20', '17', '12 19/20']) {
      const { hint } = diagnose(sub, input)
      expect(words(hint)).toBeLessThanOrEqual(12)
      expect(hint).toMatch(/\?$/)
    }
  })

  it('slip names are kind and only exist for real slips', () => {
    expect(slipName('numeratorArithmetic', 'add')).toBe('an adding slip')
    expect(slipName('forgotRegroup', 'subtract')).toBe('a borrowing slip')
    expect(slipName('unknown', 'add')).toBeNull()
    expect(slipName('none', 'add')).toBeNull()
  })
})
