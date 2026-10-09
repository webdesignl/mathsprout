import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Problem } from '../app/utils/fraction'
import { SET_SIZE, usePracticeStore } from '../app/stores/practice'

const sub: Problem = { op: 'subtract', a: { whole: 8, num: 1, den: 5 }, b: { whole: 4, num: 3, den: 4 } } // 3 9/20
const add: Problem = { op: 'add', a: { whole: 4, num: 1, den: 3 }, b: { whole: 2, num: 5, den: 12 } } // 6 3/4

function setup(list: Problem[] = [sub, add]) {
  const store = usePracticeStore()
  store.startWith(list, { op: 'mixed', needsRegroup: false })
  return store
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('practice store', () => {
  it('start() builds a set of 10 problems with matching bookkeeping', () => {
    const store = usePracticeStore()
    store.start({ op: 'mixed', needsRegroup: true }, () => 0.37)
    expect(store.total).toBe(SET_SIZE)
    expect(store.attempts).toHaveLength(SET_SIZE)
    expect(store.status.every((s) => s === 'unanswered')).toBe(true)
    expect(store.index).toBe(0)
    expect(store.score).toBe(0)
    expect(store.finished).toBe(false)
  })

  it('correct flow: scores, offers the add-back check, then moves on', () => {
    const store = setup()
    expect(store.submit('3 9/20')).toBe('correct')
    expect(store.score).toBe(1)
    expect(store.status[0]).toBe('correct')
    expect(store.attempts[0]).toBe(1)
    expect(store.hintsShown[0]).toBe(0)
    expect(store.feedback).toEqual({
      kind: 'correct',
      verify: { holds: true, expression: '3 9/20 + 4 3/4 = 8 1/5' },
    })
    expect(store.next()).toBe(true)
    expect(store.index).toBe(1)
    expect(store.feedback).toBeNull()
  })

  it('correctNotSimplest does not score or count as wrong, and can be retried', () => {
    const store = setup()
    expect(store.submit('69/20')).toBe('correctNotSimplest')
    expect(store.score).toBe(0)
    expect(store.wrongAttempts[0]).toBe(0)
    expect(store.attempts[0]).toBe(1)
    expect(store.feedback?.kind).toBe('notSimplest')
    expect(store.next()).toBe(false)
    expect(store.submit('3 9/20')).toBe('correct')
    expect(store.score).toBe(1)
  })

  it('wrong then hint: shows the diagnose hint, never the answer', () => {
    const store = setup()
    expect(store.submit('3 11/20')).toBe('wrong')
    expect(store.wrongAttempts[0]).toBe(1)
    expect(store.hintsShown[0]).toBe(1)
    const fb = store.feedback
    expect(fb?.kind).toBe('wrong')
    if (fb?.kind !== 'wrong') return
    expect(fb.hints).toHaveLength(1)
    expect(fb.hints[0]).toMatch(/\?$/)
    expect(fb.canShowSteps).toBe(false)
    expect(fb.moreHints).toBe(true)

    store.nextHint()
    expect(store.hintsShown[0]).toBe(2)
    const after = store.feedback
    if (after?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(after.hints).toHaveLength(2)
    expect(after.moreHints).toBe(false)
    for (const hint of after.hints) expect(hint).not.toContain('3 9/20')

    // Steps are locked until the second wrong answer.
    store.showSteps()
    expect(store.stepsShown[0]).toBe(0)
  })

  it('wrong twice then steps: reveals one step at a time and never the answer step', () => {
    const store = setup()
    store.submit('3 11/20')
    store.submit('3 10/20')
    expect(store.wrongAttempts[0]).toBe(2)
    const fb = store.feedback
    if (fb?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(fb.canShowSteps).toBe(true)
    expect(fb.steps).toHaveLength(0)

    store.showSteps()
    expect(store.stepsShown[0]).toBe(1)
    store.showSteps()
    expect(store.stepsShown[0]).toBe(2)

    for (let i = 0; i < 10; i++) store.showSteps()
    const all = store.feedback
    if (all?.kind !== 'wrong') throw new Error('expected wrong feedback')
    expect(all.moreSteps).toBe(false)
    expect(all.steps.map((s) => s.kind)).toEqual(['rename', 'regroup', 'subtractWholes', 'subtractNumerators'])
    expect(all.steps.some((s) => s.kind === 'answer')).toBe(false)
  })

  it('score counts solved problems and records which needed help', () => {
    const store = setup()
    store.submit('3 11/20') // wrong, hint shown
    expect(store.submit('3 9/20')).toBe('correct')
    expect(store.status[0]).toBe('correctWithHelp')
    store.next()
    expect(store.submit('6 3/4')).toBe('correct')
    expect(store.status[1]).toBe('correct')
    expect(store.score).toBe(2)
    expect(store.needsHelp.map((p) => p.number)).toEqual([1])
    expect(store.next()).toBe(true)
    expect(store.finished).toBe(true)
  })

  it('ignores blank answers and answers after the problem is solved', () => {
    const store = setup()
    expect(store.submit('   ')).toBeNull()
    expect(store.attempts[0]).toBe(0)
    store.submit('3 9/20')
    expect(store.submit('3 9/20')).toBeNull()
    expect(store.score).toBe(1)
  })

  it('invalid input counts as wrong without throwing', () => {
    const store = setup()
    expect(store.submit('1/0')).toBe('wrong')
    expect(store.submit('banana')).toBe('wrong')
    expect(store.wrongAttempts[0]).toBe(2)
  })

  it('reset() clears the set', () => {
    const store = setup()
    store.submit('3 9/20')
    store.reset()
    expect(store.total).toBe(0)
    expect(store.score).toBe(0)
  })
})
