import { describe, expect, it } from 'vitest'
import { buildBarStages } from '../app/utils/fractionBar'
import type { Plan } from '../app/utils/plan'
import { safeName } from '../server/utils/tutor/read'

/** Original: 3/4 of a class read a book. 1/3 of those who did not read it drew a picture. */
const READERS: Plan = {
  whole: 'the class',
  steps: [
    { op: 'subtract', a: '1', b: '3/4', label: 'What fraction did not read?', bName: 'read a book', name: 'did not read' },
    { op: 'multiply', a: 'r1', b: '1/3', label: 'What fraction drew a picture?', name: 'drew a picture' },
  ],
}

describe('buildBarStages', () => {
  it('builds the cut, the shading and the split, and the shaded part equals the engine answer', () => {
    const stages = buildBarStages(READERS)!
    expect(stages).toHaveLength(2)
    const [one, two] = stages as [NonNullable<typeof stages>[0], NonNullable<typeof stages>[0]]
    expect(one.before).toEqual({ cells: 4, marks: [] })
    expect(one.after.cells).toBe(4)
    expect(one.after.marks.map((m) => [m.start, m.count, m.label])).toEqual([
      [0, 3, 'read a book'],
      [3, 1, 'did not read'],
    ])
    // Every part is cut into 3: 12 parts; the "did not read" part is now 3 small parts, and 1 of them is new.
    expect(two.after.cells).toBe(12)
    expect(two.after.marks.map((m) => [m.start, m.count, m.result])).toEqual([
      [0, 9, false],
      [9, 3, true],
      [9, 1, true],
    ])
    expect(two.after.marks.at(-1)!.label).toBe('drew a picture')
    expect(two.after.marks.at(-1)!.tone).toBe(2)
  })

  it('handles a fraction of a fraction with no earlier step', () => {
    const plan: Plan = {
      steps: [
        { op: 'multiply', a: '1/2', b: '1/3', label: 'First?' },
        { op: 'subtract', a: '1', b: 'r1', label: 'The rest?' },
      ],
    }
    const stages = buildBarStages(plan)!
    expect(stages[0]!.after.cells).toBe(6)
    expect(stages[0]!.after.marks.at(-1)).toMatchObject({ start: 0, count: 1 })
    expect(stages[1]!.after.marks.at(-1)).toMatchObject({ start: 1, count: 5 })
  })

  it('returns null for plans it cannot draw', () => {
    const adding: Plan = {
      steps: [
        { op: 'multiply', a: '1/4', b: '1/5', label: 'a' },
        { op: 'multiply', a: '1/2', b: '1/3', label: 'b' },
        { op: 'add', a: 'r1', b: 'r2', label: 'c' },
      ],
    }
    expect(buildBarStages(adding)).toBeNull()
  })

  it('works with no names, using plain words', () => {
    const plan: Plan = { steps: READERS.steps.map(({ label, op, a, b }) => ({ label, op, a, b })) }
    expect(buildBarStages(plan)![0]!.after.marks[1]!.label).toBe('this part')
  })
})

describe('safeName', () => {
  it('keeps short plain words and drops digits, operations and long text', () => {
    expect(safeName('wear glasses')).toBe('wear glasses')
    expect(safeName('1/4 of them')).toBeUndefined()
    expect(safeName('add them up')).toBeUndefined()
    expect(safeName('one two three four five six seven eight nine')).toBeUndefined()
    expect(safeName(undefined)).toBeUndefined()
  })
})
