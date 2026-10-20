import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { CHAPTERS, GRADES, filterChapters, setupFor } from '../app/utils/chapters'
import { SET_SIZE, usePracticeStore } from '../app/stores/practice'

beforeEach(() => setActivePinia(createPinia()))

describe('chapters', () => {
  it('has Fractions ready and the others coming soon, for Grade 4 only', () => {
    expect(CHAPTERS.map((c) => [c.title, c.ready])).toEqual([
      ['Fractions', true],
      ['Decimals', false],
      ['Place value', false],
    ])
    expect(GRADES).toEqual([{ value: 4, label: 'Grade 4' }])
  })

  it('searches names and keywords, and an empty search shows everything', () => {
    expect(filterChapters('')).toHaveLength(3)
    expect(filterChapters('  ')).toHaveLength(3)
    expect(filterChapters('DECI').map((c) => c.id)).toEqual(['decimals'])
    expect(filterChapters('add').map((c) => c.id)).toEqual(['fractions'])
    expect(filterChapters('place').map((c) => c.id)).toEqual(['place-value'])
    expect(filterChapters('geometry')).toEqual([])
  })

  it('turns ticked operations into a practice setup', () => {
    expect(setupFor(['add'])).toEqual({ op: 'add', ops: ['add'] })
    expect(setupFor(['add', 'subtract']).ops).toEqual(['add', 'subtract'])
    expect(setupFor(['add', 'subtract', 'multiply', 'divide']).op).toBe('all')
  })
})

describe('practice with several operations ticked', () => {
  it('uses only the ticked operations, and a set of 10', () => {
    const store = usePracticeStore()
    store.start({ op: 'all', ops: ['add', 'divide'], needsRegroup: false }, Math.random)
    expect(store.total).toBe(SET_SIZE)
    expect(store.problemOps.every((o) => o === 'add' || o === 'divide')).toBe(true)
  })

  it('picks each operation across a set, not just the first', () => {
    const store = usePracticeStore()
    let n = 0
    // A fake random that cycles 0.1, 0.9, 0.1, 0.9 ... so both ticked operations are chosen.
    store.start({ op: 'all', ops: ['add', 'subtract'], needsRegroup: false }, () => ((n++ % 2) === 0 ? 0.1 : 0.9))
    expect(new Set(store.problemOps)).toEqual(new Set(['add', 'subtract']))
  })
})
