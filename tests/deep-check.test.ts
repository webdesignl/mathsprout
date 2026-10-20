import { describe, expect, it } from 'vitest'
import { ITEMS, ITEM_TYPES, RULES, type Item } from '../app/data/deepCheck'
import {
  CHAPTER_QUIZ_SIZE,
  attemptText,
  barText,
  buildChapterQuiz,
  deepCheckProgress,
  gradeAsn,
  gradeBars,
  gradeChoice,
  gradeReverse,
  itemsFor,
  stepBars,
  type BarState,
} from '../app/utils/deepCheck'
import { add, compare, equals, isSimplestFraction, isSimplestMixed, parse, parseMixed, subtract, toFraction } from '../app/utils/fraction'

const num = (text: string) => toFraction(parseMixed(text)!)
const item = <T extends Item['type']>(id: string) => ITEMS.find((i) => i.id === id) as Extract<Item, { type: T }>

describe('deep check content', () => {
  it('has 8 rules with exactly one item of each of the 5 types', () => {
    expect(RULES).toHaveLength(8)
    for (const rule of RULES) {
      const items = itemsFor(rule.id)
      expect(items.map((i) => i.type), rule.id).toEqual(ITEM_TYPES.map((t) => t.type))
      expect(rule.statement.length).toBeGreaterThan(20)
      expect(rule.misconception.length).toBeGreaterThan(10)
      expect(rule.frames.length).toBeGreaterThan(0)
    }
    expect(ITEMS).toHaveLength(40)
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(40)
  })

  it('keeps multiple-choice answers in range, with no repeated options and an explanation', () => {
    for (const i of ITEMS) {
      expect(i.explanation.length, i.id).toBeGreaterThan(20)
      if (i.type === 'spotMistake' || i.type === 'oddOneOut') {
        expect(i.answer, i.id).toBeGreaterThanOrEqual(0)
        expect(i.answer, i.id).toBeLessThan(i.options.length)
        expect(new Set(i.options).size, i.id).toBe(i.options.length)
      }
    }
  })

  it('checks the math of the "which one doesn\'t belong" items with the fraction engine', () => {
    // R1: only 5/8 is already in simplest form
    const r1 = item<'oddOneOut'>('R1-odd')
    expect(r1.options.map((o) => isSimplestFraction(parse(o)!))).toEqual([false, false, false, true])
    expect(r1.answer).toBe(3)
    // R2: all equal 4 1/5; only "4 1/5" is a mixed number in simplest form
    const r2 = item<'oddOneOut'>('R2-odd')
    expect(r2.options.every((o) => equals(parse(o)!, num('21/5')))).toBe(true)
    expect(isSimplestMixed(parseMixed(r2.options[0]!)!)).toBe(true)
    expect(isSimplestMixed(parseMixed(r2.options[1]!)!)).toBe(false)
    expect(isSimplestMixed(parseMixed(r2.options[3]!)!)).toBe(false)
    // R3: three equal 11/4, the fourth is different
    const r3 = item<'oddOneOut'>('R3-odd')
    const same = r3.options.map((o) => equals(parse(o)!, num('11/4')))
    expect(same).toEqual([true, true, true, false])
    expect(r3.answer).toBe(3)
    // R4: 10 is not a multiple of both 2 and 3
    const r4 = item<'oddOneOut'>('R4-odd')
    expect(r4.options.map((o) => Number(o) % 2 === 0 && Number(o) % 3 === 0)).toEqual([true, true, true, false])
    // R5: only 6 5/9 - 2 4/9 needs no regroup (first fraction part is big enough)
    const r5 = item<'oddOneOut'>('R5-odd')
    const needs = r5.options.map((o) => {
      const [a, b] = o.split(' − ').map((p) => parseMixed(p)!)
      return a!.num < b!.num
    })
    expect(needs).toEqual([true, true, false, true])
    expect(r5.answer).toBe(2)
    // R7: 7 3/4 - 3/4 is the biggest of the four differences
    const r7 = item<'oddOneOut'>('R7-odd')
    const diffs = r7.options.map((o) => {
      const [a, b] = o.split(' − ').map((p) => parseMixed(p)!)
      return subtract(a!, b!)
    })
    expect(diffs.every((d) => compare(diffs[0]!, d) >= 0)).toBe(true)
    expect(equals(diffs[0]!, num('7'))).toBe(true)
    // R8: only 3 ÷ 2 is not 2/3
    const r8 = item<'oddOneOut'>('R8-odd')
    const vals = [{ numerator: 2, denominator: 3 }, parse('4/6')!, { numerator: 3, denominator: 2 }, { numerator: 6, denominator: 9 }]
    expect(vals.map((v) => equals(v, num('2/3')))).toEqual([true, true, false, true])
    expect(r8.answer).toBe(2)
  })

  it('checks the worked numbers in the explanations', () => {
    expect(equals(subtract(parseMixed('8 4/20')!, parseMixed('4 15/20')!), num('3 9/20'))).toBe(true)
    expect(equals(add(num('3 9/20'), num('4 15/20')), num('8 4/20'))).toBe(true)
    expect(equals(add(num('1/4'), num('2/5')), num('13/20'))).toBe(true)
    expect(equals(subtract(num('9/10'), num('3/10')), num('6/10'))).toBe(true)
    expect(equals(subtract(parseMixed('6 1/4')!, num('3/4')), num('5 1/2'))).toBe(true)
    expect(equals(num('2 6/8'), num('11/4'))).toBe(true)
    expect(equals(num('3 6/5'), num('4 1/5'))).toBe(true)
    expect(equals(num('5 7/5'), num('6 2/5'))).toBe(true)
  })

  it('draw items start and end with consistent amounts', () => {
    for (const i of ITEMS) {
      if (i.type !== 'draw') continue
      expect(i.dens, i.id).toContain(i.start.den)
      expect(i.dens, i.id).toContain(i.target.den)
      if (i.target.exact) {
        expect(i.target.exact.wholes * i.target.den + i.target.exact.pieces, i.id).toBe(i.target.total)
      }
    }
    // Starts that must keep the same value as the target (merging, regrouping, renaming)
    for (const id of ['R1-draw', 'R2-draw', 'R4-draw', 'R5-draw']) {
      const d = item<'draw'>(id)
      const startValue = { numerator: d.start.wholes * d.start.den + d.start.pieces, denominator: d.start.den }
      expect(equals(startValue, { numerator: d.target.total, denominator: d.target.den }), id).toBe(true)
    }
  })
})

describe('grading', () => {
  it('grades always / sometimes / never and the multiple choices', () => {
    const asn = item<'asn'>('R1-asn')
    expect(gradeAsn(asn, 'sometimes').status).toBe('correct')
    expect(gradeAsn(asn, 'always').status).toBe('wrong')
    const spot = item<'spotMistake'>('R2-spot')
    expect(gradeChoice(spot, 0).status).toBe('correct')
    expect(gradeChoice(spot, 3).status).toBe('wrong')
  })

  const grade = (id: string, text: string) => gradeReverse(item<'reverse'>(id).check, text).status

  it('R1 reverse: equal to 3/4 and not simplest', () => {
    expect(grade('R1-rev', '6/8')).toBe('correct')
    expect(grade('R1-rev', '12/16')).toBe('correct')
    expect(grade('R1-rev', '3/4')).toBe('wrong')
    expect(grade('R1-rev', '2/3')).toBe('wrong')
    expect(grade('R1-rev', 'six eighths')).toBe('invalid')
    expect(grade('R1-rev', '3/0')).toBe('invalid')
    expect(grade('R1-rev', '  ')).toBe('invalid')
  })

  it('R2 reverse: a mixed number equal to 2 1/3 that is not simplest', () => {
    expect(grade('R2-rev', '1 4/3')).toBe('correct')
    expect(grade('R2-rev', '2 2/6')).toBe('correct')
    expect(grade('R2-rev', '2 1/3')).toBe('wrong')
    expect(grade('R2-rev', '7/3')).toBe('invalid')
    expect(grade('R2-rev', '2 2/3')).toBe('wrong')
  })

  it('R3 reverse: equal to 11/4 but written differently', () => {
    expect(grade('R3-rev', '2 3/4')).toBe('correct')
    expect(grade('R3-rev', '22/8')).toBe('correct')
    expect(grade('R3-rev', '11/4')).toBe('wrong')
    expect(grade('R3-rev', '2 4/5')).toBe('wrong')
    expect(grade('R3-rev', 'abc')).toBe('invalid')
  })

  it('R4 reverse: half, with 6 on the bottom', () => {
    expect(grade('R4-rev', '3/6')).toBe('correct')
    expect(grade('R4-rev', '1/2')).toBe('wrong')
    expect(grade('R4-rev', '2/6')).toBe('wrong')
  })

  it('R5 reverse: a fraction with 8 on the bottom, smaller than 5/8', () => {
    expect(grade('R5-rev', '3/8')).toBe('correct')
    expect(grade('R5-rev', '4/8')).toBe('correct')
    expect(grade('R5-rev', '5/8')).toBe('wrong')
    expect(grade('R5-rev', '7/8')).toBe('wrong')
    expect(grade('R5-rev', '0/8')).toBe('wrong')
    expect(grade('R5-rev', '3/4')).toBe('wrong')
  })

  it('R6, R7 and R8 reverse', () => {
    expect(grade('R6-rev', '3/8')).toBe('correct')
    expect(grade('R6-rev', '6/16')).toBe('correct')
    expect(grade('R6-rev', '4/8')).toBe('wrong')
    expect(grade('R7-rev', '6 1/2')).toBe('correct')
    expect(grade('R7-rev', '5')).toBe('wrong')
    expect(grade('R7-rev', '4 3/4')).toBe('wrong')
    expect(grade('R8-rev', '3 ÷ 5')).toBe('correct')
    expect(grade('R8-rev', '6 divided by 10')).toBe('correct')
    expect(grade('R8-rev', '5 ÷ 3')).toBe('wrong')
    expect(grade('R8-rev', '3/5')).toBe('invalid')
    expect(grade('R8-rev', '3 ÷ 0')).toBe('invalid')
  })
})

describe('the bar builder', () => {
  const start = (id: string): BarState => ({ ...item<'draw'>(id).start })
  const run = (id: string, actions: Parameters<typeof stepBars>[1][]) => {
    const dens = item<'draw'>(id).dens
    let state = start(id)
    for (const a of actions) state = stepBars(state, a, dens).state
    return state
  }

  it('merges 4/8 into 1/2 (R1), and refuses a cut that is not even', () => {
    const state = run('R1-draw', [{ type: 'den', den: 4 }, { type: 'den', den: 2 }])
    expect(state).toEqual({ wholes: 0, pieces: 1, den: 2 })
    expect(gradeBars(item<'draw'>('R1-draw').target, state).status).toBe('correct')
    expect(gradeBars(item<'draw'>('R1-draw').target, start('R1-draw')).status).toBe('wrong')
    const blocked = stepBars({ wholes: 0, pieces: 1, den: 2 }, { type: 'den', den: 3 }, [2, 3, 6])
    expect(blocked.state.den).toBe(2)
    expect(blocked.message).toMatch(/evenly/)
  })

  it('regroups 3 6/5 into 4 1/5 (R2), and the amount alone is not enough', () => {
    const target = item<'draw'>('R2-draw').target
    expect(gradeBars(target, start('R2-draw')).status).toBe('wrong')
    const state = run('R2-draw', [{ type: 'regroup' }])
    expect(state).toEqual({ wholes: 4, pieces: 1, den: 5 })
    expect(barText(state)).toBe('4 1/5')
    expect(gradeBars(target, state).status).toBe('correct')
    expect(stepBars({ wholes: 4, pieces: 1, den: 5 }, { type: 'regroup' }, [5]).message).toMatch(/need 5 pieces/)
  })

  it('accepts any grouping of 11/4 in eighths (R3)', () => {
    const target = item<'draw'>('R3-draw').target
    const a = run('R3-draw', [{ type: 'addWhole' }, { type: 'addWhole' }, ...Array(6).fill({ type: 'addPiece' })])
    expect(gradeBars(target, a).status).toBe('correct')
    const b = run('R3-draw', Array(22).fill({ type: 'addPiece' }))
    expect(gradeBars(target, b).status).toBe('correct')
    expect(gradeBars(target, run('R3-draw', [{ type: 'addWhole' }])).status).toBe('wrong')
  })

  it('renames 1/2 to 3/6 (R4) and breaks a whole into 24 pieces (R5)', () => {
    expect(gradeBars(item<'draw'>('R4-draw').target, run('R4-draw', [{ type: 'den', den: 6 }])).status).toBe('correct')
    const r5 = item<'draw'>('R5-draw').target
    expect(gradeBars(r5, start('R5-draw')).status).toBe('wrong')
    const broken = run('R5-draw', [{ type: 'breakWhole' }])
    expect(broken).toEqual({ wholes: 7, pieces: 24, den: 20 })
    expect(gradeBars(r5, broken).status).toBe('correct')
  })

  it('builds 3/4 (R6), 3/8 (R7) and 5/8 (R8) one piece at a time', () => {
    expect(gradeBars(item<'draw'>('R6-draw').target, run('R6-draw', [{ type: 'addPiece' }])).status).toBe('correct')
    expect(gradeBars(item<'draw'>('R7-draw').target, run('R7-draw', Array(3).fill({ type: 'addPiece' }))).status).toBe('correct')
    expect(gradeBars(item<'draw'>('R8-draw').target, run('R8-draw', Array(5).fill({ type: 'addPiece' }))).status).toBe('correct')
    expect(gradeBars(item<'draw'>('R8-draw').target, run('R8-draw', Array(6).fill({ type: 'addPiece' }))).status).toBe('wrong')
  })

  it('does not go below zero or past the limits', () => {
    const empty: BarState = { wholes: 0, pieces: 0, den: 4 }
    expect(stepBars(empty, { type: 'removePiece' }, [4]).state).toEqual(empty)
    expect(stepBars(empty, { type: 'removeWhole' }, [4]).state).toEqual(empty)
    expect(stepBars(empty, { type: 'breakWhole' }, [4]).state).toEqual(empty)
    expect(stepBars(empty, { type: 'den', den: 7 }, [4]).message).toMatch(/cannot cut/)
  })
})

describe('quizzes and progress', () => {
  it('builds a chapter quiz of 10 different items that covers every rule', () => {
    const quiz = buildChapterQuiz(() => 0.37)
    expect(quiz).toHaveLength(CHAPTER_QUIZ_SIZE)
    expect(new Set(quiz.map((i) => i.id)).size).toBe(CHAPTER_QUIZ_SIZE)
    expect(new Set(quiz.map((i) => i.ruleId)).size).toBe(8)
  })

  it('counts a star for each question type answered right at least once', () => {
    const lines = [
      { mode: 'deep_check', problem: attemptText({ ruleId: 'R2', type: 'asn' }), correct: true },
      { mode: 'deep_check', problem: 'R2 asn', correct: true },
      { mode: 'deep_check', problem: 'R2 spotMistake', correct: false },
      { mode: 'deep_check', problem: 'R2 draw', correct: true },
      { mode: 'practice', problem: '1/2 + 1/3', correct: true },
      { mode: 'deep_check', problem: 'R99 asn', correct: true },
    ]
    const progress = deepCheckProgress(lines)
    expect(progress.R2).toEqual({ stars: 2, tried: 4, right: 3 })
    expect(progress.R1).toEqual({ stars: 0, tried: 0, right: 0 })
    expect(Object.keys(progress)).toHaveLength(8)
  })
})

import { createPinia, setActivePinia } from 'pinia'
import { useDeepCheckStore } from '../app/stores/deepCheck'
import { useSyncStore } from '../app/stores/sync'

describe('the Deep Check store', () => {
  function setup() {
    setActivePinia(createPinia())
    const rows: Array<Record<string, unknown>> = []
    useSyncStore().configure({
      save: async (row) => (rows.push(row as unknown as Record<string, unknown>), true),
      familyId: async () => 'fam',
      childId: () => 'kid',
    })
    return { store: useDeepCheckStore(), rows }
  }
  const flush = () => new Promise((r) => setTimeout(r, 0))

  it('runs a rule quiz: five questions, one try each, then the result', async () => {
    const { store, rows } = setup()
    store.startRule('R2')
    expect(store.view).toBe('quiz')
    expect(store.total).toBe(5)
    expect(store.answerAsn('always').status).toBe('correct')
    expect(store.feedback?.correct).toBe(true)
    // A second answer to the same question is ignored
    store.answerAsn('never')
    expect(store.results).toHaveLength(1)
    store.next()
    expect(store.answerChoice(2).status).toBe('wrong')
    expect(store.feedback?.correct).toBe(false)
    expect(store.feedback?.explanation).toMatch(/7\/5/)
    store.next()
    store.answerChoice(0)
    store.next()
    // An answer that cannot be read is not counted, so she can fix it
    expect(store.answerReverse('banana').status).toBe('invalid')
    expect(store.results).toHaveLength(3)
    expect(store.answerReverse('1 4/3').status).toBe('correct')
    store.next()
    store.answerDraw({ wholes: 4, pieces: 1, den: 5 })
    expect(store.isLast).toBe(true)
    store.next()
    expect(store.view).toBe('done')
    expect(store.score).toBe(4)
    await flush()
    expect(rows.map((r) => [r.mode, r.problem, r.correct])).toEqual([
      ['deep_check', 'R2 asn', true],
      ['deep_check', 'R2 spotMistake', false],
      ['deep_check', 'R2 oddOneOut', true],
      ['deep_check', 'R2 reverse', true],
      ['deep_check', 'R2 draw', true],
    ])
  })

  it('does not move on before she answers, and an answer of the wrong kind is refused', () => {
    const { store } = setup()
    store.startRule('R1')
    store.next()
    expect(store.index).toBe(0)
    expect(store.answerChoice(0).status).toBe('invalid')
    expect(store.results).toHaveLength(0)
  })

  it('starts the chapter quiz and Learn mode, and goes home', () => {
    const { store } = setup()
    store.startChapter(() => 0.5)
    expect(store.total).toBe(10)
    expect(store.scope).toBe('chapter')
    store.goHome()
    expect(store.view).toBe('home')
    store.openLearn('R7')
    expect(store.view).toBe('learn')
    expect(store.rule?.id).toBe('R7')
    store.openLearn('nope')
    expect(store.rule?.id).toBe('R7')
  })
})
