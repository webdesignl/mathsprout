import { describe, expect, it } from 'vitest'
import { CHALLENGES, ITEMS, ITEM_TYPES, RULES, RULE_GROUPS, type Item } from '../app/data/deepCheck'
import {
  CHAPTER_QUIZ_SIZE,
  attemptText,
  barText,
  buildChapterQuiz,
  challengeOf,
  challengesIn,
  challengesSolved,
  deepCheckProgress,
  gradeChallenge,
  gradeAsn,
  gradeBars,
  gradeChoice,
  gradeModel,
  gradeReverse,
  groupOf,
  itemsFor,
  ruleOf,
  rulesIn,
  stepBars,
  type BarState,
} from '../app/utils/deepCheck'
import { modelStage } from '../app/utils/modelSamples'
import { add, compare, divide, equals, isSimplestFraction, isSimplestMixed, multiply, parse, parseMixed, subtract, toFraction } from '../app/utils/fraction'

const num = (text: string) => toFraction(parseMixed(text)!)
const item = <T extends Item['type']>(id: string) => ITEMS.find((i) => i.id === id) as Extract<Item, { type: T }>

describe('deep check content', () => {
  it('has 21 rules with exactly one item of each of the 5 types', () => {
    expect(RULES).toHaveLength(21)
    for (const rule of RULES) {
      const items = itemsFor(rule.id)
      expect(items.map((i) => i.type), rule.id).toEqual(ITEM_TYPES.map((t) => t.type))
      expect(rule.statement.length).toBeGreaterThan(20)
      expect(rule.misconception.length).toBeGreaterThan(10)
      expect(rule.frames.length).toBeGreaterThan(0)
    }
    expect(ITEMS).toHaveLength(105)
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(105)
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
      if (i.type !== 'draw' || 'model' in i) continue
      expect(i.dens, i.id).toContain(i.start.den)
      expect(i.dens, i.id).toContain(i.target.den)
      if (i.target.exact) {
        expect(i.target.exact.wholes * i.target.den + i.target.exact.pieces, i.id).toBe(i.target.total)
      }
    }
    // Starts that must keep the same value as the target (merging, regrouping, renaming)
    for (const id of ['R1-draw', 'R2-draw', 'R4-draw', 'R5-draw', 'R9-draw', 'R11-draw']) {
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
    const quiz = buildChapterQuiz('addsub', () => 0.37)
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
    expect(Object.keys(progress)).toHaveLength(21)
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
    store.startChapter('addsub', () => 0.5)
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

describe('rule groups', () => {
  it('puts R1 to R8 under addition and subtraction and R9 to R12 under multiplication and division', () => {
    expect(RULE_GROUPS.map((g) => g.title)).toEqual([
      'Fraction addition and subtraction',
      'Fraction multiplication and division',
      'Word-problem models',
    ])
    expect(rulesIn('models').map((r) => r.id)).toEqual(['R19', 'R20', 'R21'])
    expect(rulesIn('addsub').map((r) => r.id)).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8'])
    expect(rulesIn('muldiv').map((r) => r.id)).toEqual(['R9', 'R10', 'R11', 'R12', 'R13', 'R14', 'R15', 'R16', 'R17', 'R18'])
    expect(groupOf('nope')).toBeUndefined()
    // every rule belongs to exactly one group
    const all = RULE_GROUPS.flatMap((g) => g.ruleIds)
    expect(all.sort()).toEqual(RULES.map((r) => r.id).sort())
  })

  it('builds no quiz for an unknown group, and the store refuses to start one', () => {
    expect(buildChapterQuiz('nope', () => 0.5)).toEqual([])
    setActivePinia(createPinia())
    const store = useDeepCheckStore()
    store.startChapter('nope')
    expect(store.view).toBe('home')
  })

  it('builds a 10-question quiz for multiplication and division from R9 to R12 only', () => {
    const quiz = buildChapterQuiz('muldiv', () => 0.4)
    expect(quiz).toHaveLength(10)
    expect(new Set(quiz.map((i) => i.id)).size).toBe(10)
    // one question from each of the 10 rules
    expect(new Set(quiz.map((i) => i.ruleId)).size).toBe(10)
    expect(quiz.every((i) => rulesIn('muldiv').some((r) => r.id === i.ruleId))).toBe(true)
  })

  it('a quiz only uses rules from its group', () => {
    const quiz = buildChapterQuiz('addsub', () => 0.9)
    expect(quiz.every((i) => rulesIn('addsub').some((r) => r.id === i.ruleId))).toBe(true)
  })
})

describe('multiplication and division items (checked with the fraction engine)', () => {
  const frac = (t: string) => parse(t)!

  it('R9: three equal 2 1/2, one different', () => {
    const odd = item<'oddOneOut'>('R9-odd')
    expect(odd.options.map((o) => equals(frac(o), frac('2 1/2')))).toEqual([true, true, true, false])
    expect(odd.answer).toBe(3)
    // 2 1/2 x 2 1/2 is 6 1/4, not 4 1/4
    expect(equals(multiply(frac('5/2'), frac('5/2')), frac('6 1/4'))).toBe(true)
    expect(equals(multiply(frac('5/2'), frac('5/2')), frac('4 1/4'))).toBe(false)
    expect(equals(frac('3 1/4'), frac('13/4'))).toBe(true)
  })

  it('R10: only 12 x 5/4 is bigger than 12; the meaning of a part of a part', () => {
    const odd = item<'oddOneOut'>('R10-odd')
    const bigger = odd.options.map((o) => compare(multiply(frac('12'), frac(o.split(' × ')[1]!)), frac('12')) > 0)
    expect(bigger).toEqual([false, false, true, false])
    expect(odd.answer).toBe(2)
    expect(equals(multiply(frac('3/4'), frac('1/2')), frac('3/8'))).toBe(true)
    expect(equals(multiply(frac('8'), frac('1/2')), frac('4'))).toBe(true)
  })

  it('R11: only 6 ÷ 3/2 is smaller than 6; the jumps and the halves', () => {
    const odd = item<'oddOneOut'>('R11-odd')
    const bigger = odd.options.map((o) => {
      const result = divide(frac('6'), frac(o.split(' ÷ ')[1]!))
      return result.ok && compare(result.value, frac('6')) > 0
    })
    expect(bigger).toEqual([true, true, false, true])
    expect(odd.answer).toBe(2)
    const ok = (a: string, b: string) => {
      const r = divide(frac(a), frac(b))
      return r.ok ? r.value : null
    }
    expect(equals(ok('3/4', '1/2')!, frac('1 1/2'))).toBe(true)
    expect(equals(ok('3', '1/2')!, frac('6'))).toBe(true)
    expect(equals(ok('4', '1/2')!, frac('8'))).toBe(true)
    expect(equals(multiply(frac('3/4'), frac('1/2')), frac('3/8'))).toBe(true)
  })

  it('R12: keep, change, flip', () => {
    const odd = item<'oddOneOut'>('R12-odd')
    const target = divide(frac('3/5'), frac('2/7'))
    expect(target.ok && equals(target.value, frac('21/10'))).toBe(true)
    const value = (o: string) => (o.includes(' × ') ? multiply(frac(o.split(' × ')[0]!), frac(o.split(' × ')[1]!)) : frac(o))
    expect(odd.options.map((o) => target.ok && equals(value(o), target.value))).toEqual([true, true, true, false])
    expect(odd.answer).toBe(3)
    const lia = divide(frac('3/4'), frac('2/3'))
    expect(lia.ok && equals(lia.value, frac('1 1/8'))).toBe(true)
    expect(equals(multiply(frac('3/4'), frac('3/2')), frac('9/8'))).toBe(true)
  })

  const grade = (id: string, text: string) => gradeReverse(item<'reverse'>(id).check, text).status
  it('grades the new "reverse it" answers', () => {
    expect(grade('R9-rev', '13/4')).toBe('correct')
    expect(grade('R9-rev', '26/8')).toBe('correct')
    expect(grade('R9-rev', '3 1/4')).toBe('invalid')
    expect(grade('R9-rev', '12/4')).toBe('wrong')
    expect(grade('R10-rev', '3/5')).toBe('correct')
    expect(grade('R10-rev', '5/3')).toBe('wrong')
    expect(grade('R10-rev', '0/5')).toBe('wrong')
    expect(grade('R10-rev', '5/5')).toBe('wrong')
    expect(grade('R10-rev', 'half')).toBe('invalid')
    expect(grade('R11-rev', '1/2')).toBe('correct')
    expect(grade('R11-rev', '2/4')).toBe('correct')
    expect(grade('R11-rev', '2')).toBe('wrong')
    expect(grade('R12-rev', '5/2')).toBe('correct')
    expect(grade('R12-rev', '10/4')).toBe('correct')
    expect(grade('R12-rev', '2/5')).toBe('wrong')
  })

  it('plays the new "draw it" items', () => {
    const run = (id: string, actions: Parameters<typeof stepBars>[1][]) => {
      const d = item<'draw'>(id)
      let state: BarState = { ...d.start }
      for (const a of actions) state = stepBars(state, a, d.dens).state
      return gradeBars(d.target, state).status
    }
    expect(run('R9-draw', [])).toBe('wrong')
    expect(run('R9-draw', [{ type: 'breakWhole' }, { type: 'breakWhole' }])).toBe('correct')
    expect(run('R10-draw', [{ type: 'den', den: 8 }, { type: 'removePiece' }, { type: 'removePiece' }, { type: 'removePiece' }])).toBe('correct')
    expect(run('R10-draw', [{ type: 'den', den: 8 }])).toBe('wrong')
    expect(run('R11-draw', [{ type: 'den', den: 2 }, { type: 'breakWhole' }, { type: 'breakWhole' }, { type: 'breakWhole' }])).toBe('correct')
    expect(run('R11-draw', [{ type: 'den', den: 2 }])).toBe('wrong')
    expect(run('R12-draw', [{ type: 'addPiece' }, { type: 'addPiece' }, { type: 'addPiece' }])).toBe('correct')
  })
})

describe('rules 13 to 18 (checked with the fraction engine)', () => {
  const frac = (t: string) => parse(t)!
  const expr = (text: string) => {
    // "8 × 4 2/3", "8 ÷ 2 3/4", "1/2 × 3/4", "2/5 ÷ 3", or a plain number
    const m = /^(.+?) ([×÷]) (.+)$/.exec(text)
    if (!m) return frac(text)
    const a = frac(m[1]!)
    const b = frac(m[3]!)
    if (m[2] === '×') return multiply(a, b)
    const r = divide(a, b)
    if (!r.ok) throw new Error('divide by zero')
    return r.value
  }

  /** Every way to put four different digits into □ ÷/× □ □/□ with a proper fraction in simplest form. */
  function arrangements(digits: number[]) {
    const out: { a: number; b: number; c: number; d: number }[] = []
    for (const a of digits) for (const b of digits) for (const c of digits) for (const d of digits) {
      if (new Set([a, b, c, d]).size !== 4 || c >= d || !isSimplestFraction({ numerator: c, denominator: d })) continue
      out.push({ a, b, c, d })
    }
    return out
  }
  const product = (t: { a: number; b: number; c: number; d: number }) => multiply(frac(String(t.a)), frac(`${t.b} ${t.c}/${t.d}`))
  const quotient = (t: { a: number; b: number; c: number; d: number }) => {
    const r = divide(frac(String(t.a)), frac(`${t.b} ${t.c}/${t.d}`))
    if (!r.ok) throw new Error('divide by zero')
    return r.value
  }
  const best = (digits: number[], f: typeof product, want: 'max' | 'min') => {
    const all = arrangements(digits).map((t) => ({ t, v: f(t) }))
    return all.reduce((x, y) => ((want === 'max' ? compare(y.v, x.v) > 0 : compare(y.v, x.v) < 0) ? y : x))
  }

  it('R13: the whole changes (24 tarts, half, then half of the rest)', () => {
    expect(equals(multiply(frac('1/2'), frac('24')), frac('12'))).toBe(true)
    expect(equals(multiply(frac('1/2'), frac('12')), frac('6'))).toBe(true)
    expect(equals(frac('6'), multiply(frac('1/4'), frac('24')))).toBe(true)
    // working backwards from 5 left
    expect(equals(multiply(frac('5'), frac('2')), frac('10'))).toBe(true)
    expect(equals(multiply(frac('10'), frac('2')), frac('20'))).toBe(true)
    const odd = item<'oddOneOut'>('R13-odd')
    expect(odd.options[odd.answer]).toBe('In the afternoon he sells 12')
  })

  it('R14: "of" is multiply', () => {
    const odd = item<'oddOneOut'>('R14-odd')
    const half = multiply(frac('1/2'), frac('3/4'))
    expect(odd.options.map((o) => equals(expr(o), half))).toEqual([true, true, true, false])
    expect(equals(multiply(frac('1/3'), frac('3/5')), frac('1/5'))).toBe(true)
    expect(equals(multiply(frac('1/2'), frac('1/2')), frac('1/4'))).toBe(true)
  })

  it('R15: straight across', () => {
    const odd = item<'oddOneOut'>('R15-odd')
    const target = multiply(frac('2/3'), frac('3/4'))
    expect(odd.options.map((o) => equals(frac(o), target))).toEqual([true, true, true, false])
    expect(equals(multiply(frac('5'), frac('2/3')), frac('10/3'))).toBe(true)
    expect(equals(frac('6/12'), frac('1/2'))).toBe(true)
  })

  it('R16: simplify first', () => {
    expect(equals(multiply(frac('4/9'), frac('3/8')), frac('1/6'))).toBe(true)
    expect(equals(multiply(frac('2/5'), frac('2/3')), frac('4/15'))).toBe(true)
    expect(equals(multiply(frac('2/5'), frac('2/3')), frac('1/15'))).toBe(false)
    // 6/10 x 5/9: the three good moves share the factors the options say; the two tops share none
    expect([gcdOf(6, 9), gcdOf(5, 10), gcdOf(6, 10), gcdOf(6, 5)]).toEqual([3, 5, 2, 1])
  })

  it('R17: times 1/n is divided by n', () => {
    const odd = item<'oddOneOut'>('R17-odd')
    const target = multiply(frac('2/5'), frac('1/3'))
    expect(odd.options.map((o) => equals(expr(o), target))).toEqual([true, true, true, false])
    expect(equals(multiply(frac('8'), frac('1/4')), frac('2'))).toBe(true)
    expect(equals(expr('2/5 ÷ 1/3'), frac('1 1/5'))).toBe(true)
  })

  it('digit cards 2, 3, 4, 8: the table of greatest and smallest products (the first is the rule, the others are for the challenge)', () => {
    const digits = [2, 3, 4, 8]
    const greatest = best(digits, product, 'max')
    const smallest = best(digits, product, 'min')
    expect(greatest.t).toEqual({ a: 8, b: 4, c: 2, d: 3 })
    expect(equals(greatest.v, frac('37 1/3'))).toBe(true)
    expect(smallest.t).toEqual({ a: 2, b: 4, c: 3, d: 8 })
    expect(equals(smallest.v, frac('8 3/4'))).toBe(true)
    const odd = item<'oddOneOut'>('R18-odd')
    const values = odd.options.map((o) => expr(o))
    expect(values.every((v) => compare(values[odd.answer]!, v) >= 0)).toBe(true)
    expect(odd.options[odd.answer]).toBe('8 × 4 2/3')
    expect(equals(expr('4 × 8 2/3'), frac('34 2/3'))).toBe(true)
    // the reverse item: the greatest product with 1, 5, 6 and 9
    const rev = best([1, 5, 6, 9], product, 'max')
    expect(rev.t).toEqual({ a: 9, b: 6, c: 1, d: 5 })
    expect(equals(rev.v, grade35(item<'reverse'>('R18-rev')))).toBe(true)
    expect(equals(rev.v, frac('55 4/5'))).toBe(true)
  })

  it('R18: biggest digit in front, then the next biggest as the whole, always wins when the two smallest make a fraction', () => {
    let checked = 0
    for (let a = 1; a <= 9; a++) for (let b = a + 1; b <= 9; b++) for (let c = b + 1; c <= 9; c++) for (let d = c + 1; d <= 9; d++) {
      const digits = [a, b, c, d]
      // the two smallest, a and b, make the fraction a/b when it is in simplest form
      if (!isSimplestFraction({ numerator: a, denominator: b })) continue
      const rule = { a: d, b: c, c: a, d: b }
      expect(compare(product(rule), best(digits, product, 'max').v), digits.join()).toBe(0)
      checked++
    }
    expect(checked).toBeGreaterThan(50)
  })

  it('digit cards 2, 3, 4, 8: the quotients in the challenge, and why there is no single rule for them', () => {
    const digits = [2, 3, 4, 8]
    const greatest = best(digits, quotient, 'max')
    const smallest = best(digits, quotient, 'min')
    expect(greatest.t).toEqual({ a: 8, b: 2, c: 3, d: 4 })
    expect(equals(greatest.v, frac('2 10/11'))).toBe(true)
    expect(smallest.t).toEqual({ a: 2, b: 8, c: 3, d: 4 })
    expect(equals(smallest.v, frac('8/35'))).toBe(true)
    // With 1, 2, 4 and 5 the greatest quotient does NOT have the biggest digit in front, so "biggest in front" is not a rule.
    const other = best([1, 2, 4, 5], quotient, 'max')
    expect(other.t.a).toBe(4)
    expect(equals(other.v, frac('2 6/7'))).toBe(true)
    expect(equals(expr('5 ÷ 2 1/4'), frac('2 2/9'))).toBe(true)
  })

  const grade = (id: string, text: string) => gradeReverse(item<'reverse'>(id).check, text).status
  it('grades the new "reverse it" answers', () => {
    expect(grade('R9-rev', '13/4')).toBe('correct')
    expect(grade('R9-rev', '26/8')).toBe('correct')
    expect(grade('R9-rev', '3 1/4')).toBe('invalid')
    expect(grade('R9-rev', '12/4')).toBe('wrong')
    expect(grade('R10-rev', '3/5')).toBe('correct')
    expect(grade('R10-rev', '5/3')).toBe('wrong')
    expect(grade('R10-rev', '0/5')).toBe('wrong')
    expect(grade('R10-rev', '5/5')).toBe('wrong')
    expect(grade('R10-rev', 'half')).toBe('invalid')
    expect(grade('R11-rev', '1/2')).toBe('correct')
    expect(grade('R11-rev', '2/4')).toBe('correct')
    expect(grade('R11-rev', '2')).toBe('wrong')
    expect(grade('R12-rev', '5/2')).toBe('correct')
    expect(grade('R12-rev', '10/4')).toBe('correct')
    expect(grade('R12-rev', '2/5')).toBe('wrong')
  })

  it('plays the new "draw it" items', () => {
    const run = (id: string, actions: Parameters<typeof stepBars>[1][]) => {
      const d = item<'draw'>(id)
      let state: BarState = { ...d.start }
      for (const a of actions) state = stepBars(state, a, d.dens).state
      return gradeBars(d.target, state).status
    }
    expect(run('R9-draw', [])).toBe('wrong')
    expect(run('R9-draw', [{ type: 'breakWhole' }, { type: 'breakWhole' }])).toBe('correct')
    expect(run('R10-draw', [{ type: 'den', den: 8 }, { type: 'removePiece' }, { type: 'removePiece' }, { type: 'removePiece' }])).toBe('correct')
    expect(run('R10-draw', [{ type: 'den', den: 8 }])).toBe('wrong')
    expect(run('R11-draw', [{ type: 'den', den: 2 }, { type: 'breakWhole' }, { type: 'breakWhole' }, { type: 'breakWhole' }])).toBe('correct')
    expect(run('R11-draw', [{ type: 'den', den: 2 }])).toBe('wrong')
    expect(run('R12-draw', [{ type: 'addPiece' }, { type: 'addPiece' }, { type: 'addPiece' }])).toBe('correct')
  })
})

describe('rules 13 to 18 (checked with the fraction engine)', () => {
  const frac = (t: string) => parse(t)!
  const expr = (text: string) => {
    // "8 × 4 2/3", "8 ÷ 2 3/4", "1/2 × 3/4", "2/5 ÷ 3", or a plain number
    const m = /^(.+?) ([×÷]) (.+)$/.exec(text)
    if (!m) return frac(text)
    const a = frac(m[1]!)
    const b = frac(m[3]!)
    if (m[2] === '×') return multiply(a, b)
    const r = divide(a, b)
    if (!r.ok) throw new Error('divide by zero')
    return r.value
  }

  /** Every way to put four different digits into □ ÷/× □ □/□ with a proper fraction in simplest form. */
  function arrangements(digits: number[]) {
    const out: { a: number; b: number; c: number; d: number }[] = []
    for (const a of digits) for (const b of digits) for (const c of digits) for (const d of digits) {
      if (new Set([a, b, c, d]).size !== 4 || c >= d || !isSimplestFraction({ numerator: c, denominator: d })) continue
      out.push({ a, b, c, d })
    }
    return out
  }
  const product = (t: { a: number; b: number; c: number; d: number }) => multiply(frac(String(t.a)), frac(`${t.b} ${t.c}/${t.d}`))
  const quotient = (t: { a: number; b: number; c: number; d: number }) => {
    const r = divide(frac(String(t.a)), frac(`${t.b} ${t.c}/${t.d}`))
    if (!r.ok) throw new Error('divide by zero')
    return r.value
  }
  const best = (digits: number[], f: typeof product, want: 'max' | 'min') => {
    const all = arrangements(digits).map((t) => ({ t, v: f(t) }))
    return all.reduce((x, y) => ((want === 'max' ? compare(y.v, x.v) > 0 : compare(y.v, x.v) < 0) ? y : x))
  }

  it('R13: the whole changes (24 tarts, half, then half of the rest)', () => {
    expect(equals(multiply(frac('1/2'), frac('24')), frac('12'))).toBe(true)
    expect(equals(multiply(frac('1/2'), frac('12')), frac('6'))).toBe(true)
    expect(equals(frac('6'), multiply(frac('1/4'), frac('24')))).toBe(true)
    // working backwards from 5 left
    expect(equals(multiply(frac('5'), frac('2')), frac('10'))).toBe(true)
    expect(equals(multiply(frac('10'), frac('2')), frac('20'))).toBe(true)
    const odd = item<'oddOneOut'>('R13-odd')
    expect(odd.options[odd.answer]).toBe('In the afternoon he sells 12')
  })

  it('R14: "of" is multiply', () => {
    const odd = item<'oddOneOut'>('R14-odd')
    const half = multiply(frac('1/2'), frac('3/4'))
    expect(odd.options.map((o) => equals(expr(o), half))).toEqual([true, true, true, false])
    expect(equals(multiply(frac('1/3'), frac('3/5')), frac('1/5'))).toBe(true)
    expect(equals(multiply(frac('1/2'), frac('1/2')), frac('1/4'))).toBe(true)
  })

  it('R15: straight across', () => {
    const odd = item<'oddOneOut'>('R15-odd')
    const target = multiply(frac('2/3'), frac('3/4'))
    expect(odd.options.map((o) => equals(frac(o), target))).toEqual([true, true, true, false])
    expect(equals(multiply(frac('5'), frac('2/3')), frac('10/3'))).toBe(true)
    expect(equals(frac('6/12'), frac('1/2'))).toBe(true)
  })

  it('R16: simplify first', () => {
    expect(equals(multiply(frac('4/9'), frac('3/8')), frac('1/6'))).toBe(true)
    expect(equals(multiply(frac('2/5'), frac('2/3')), frac('4/15'))).toBe(true)
    expect(equals(multiply(frac('2/5'), frac('2/3')), frac('1/15'))).toBe(false)
    // 6/10 x 5/9: the three good moves share the factors the options say; the two tops share none
    expect([gcdOf(6, 9), gcdOf(5, 10), gcdOf(6, 10), gcdOf(6, 5)]).toEqual([3, 5, 2, 1])
  })

  it('R17: times 1/n is divided by n', () => {
    const odd = item<'oddOneOut'>('R17-odd')
    const target = multiply(frac('2/5'), frac('1/3'))
    expect(odd.options.map((o) => equals(expr(o), target))).toEqual([true, true, true, false])
    expect(equals(multiply(frac('8'), frac('1/4')), frac('2'))).toBe(true)
    expect(equals(expr('2/5 ÷ 1/3'), frac('1 1/5'))).toBe(true)
  })

  it('digit cards 2, 3, 4, 8: the table of greatest and smallest products (the first is the rule, the others are for the challenge)', () => {
    const digits = [2, 3, 4, 8]
    const greatest = best(digits, product, 'max')
    const smallest = best(digits, product, 'min')
    expect(greatest.t).toEqual({ a: 8, b: 4, c: 2, d: 3 })
    expect(equals(greatest.v, frac('37 1/3'))).toBe(true)
    expect(smallest.t).toEqual({ a: 2, b: 4, c: 3, d: 8 })
    expect(equals(smallest.v, frac('8 3/4'))).toBe(true)
    const odd = item<'oddOneOut'>('R18-odd')
    const values = odd.options.map((o) => expr(o))
    expect(values.every((v) => compare(values[odd.answer]!, v) >= 0)).toBe(true)
    expect(odd.options[odd.answer]).toBe('8 × 4 2/3')
    expect(equals(expr('4 × 8 2/3'), frac('34 2/3'))).toBe(true)
    // the reverse item: the greatest product with 1, 5, 6 and 9
    const rev = best([1, 5, 6, 9], product, 'max')
    expect(rev.t).toEqual({ a: 9, b: 6, c: 1, d: 5 })
    expect(equals(rev.v, grade35(item<'reverse'>('R18-rev')))).toBe(true)
    expect(equals(rev.v, frac('55 4/5'))).toBe(true)
  })

  it('R18: biggest digit in front, then the next biggest as the whole, always wins when the two smallest make a fraction', () => {
    let checked = 0
    for (let a = 1; a <= 9; a++) for (let b = a + 1; b <= 9; b++) for (let c = b + 1; c <= 9; c++) for (let d = c + 1; d <= 9; d++) {
      const digits = [a, b, c, d]
      // the two smallest, a and b, make the fraction a/b when it is in simplest form
      if (!isSimplestFraction({ numerator: a, denominator: b })) continue
      const rule = { a: d, b: c, c: a, d: b }
      expect(compare(product(rule), best(digits, product, 'max').v), digits.join()).toBe(0)
      checked++
    }
    expect(checked).toBeGreaterThan(50)
  })

  const grade = (id: string, text: string) => gradeReverse(item<'reverse'>(id).check, text).status
  it('grades the new "reverse it" answers', () => {
    expect(grade('R13-rev', '20')).toBe('correct')
    expect(grade('R13-rev', '10')).toBe('wrong')
    expect(grade('R14-rev', '1/5')).toBe('correct')
    expect(grade('R14-rev', '3/15')).toBe('correct')
    expect(grade('R14-rev', '5/1')).toBe('wrong')
    expect(grade('R15-rev', '10/3')).toBe('correct')
    expect(grade('R15-rev', '3 1/3')).toBe('correct')
    expect(grade('R15-rev', '10/15')).toBe('wrong')
    expect(grade('R16-rev', '1/6')).toBe('correct')
    expect(grade('R16-rev', '12/72')).toBe('correct')
    expect(grade('R17-rev', '1/3')).toBe('correct')
    expect(grade('R17-rev', '3')).toBe('wrong')
    expect(grade('R18-rev', '55 4/5')).toBe('correct')
    expect(grade('R18-rev', '279/5')).toBe('correct')
    expect(grade('R18-rev', '8 3/4')).toBe('wrong')
  })

  it('plays the new "draw it" items', () => {
    const run = (id: string, actions: Parameters<typeof stepBars>[1][]) => {
      const d = item<'draw'>(id)
      let state: BarState = { ...d.start }
      for (const a of actions) state = stepBars(state, a, d.dens).state
      return gradeBars(d.target, state).status
    }
    expect(run('R13-draw', [{ type: 'removePiece' }, { type: 'removePiece' }, { type: 'removePiece' }])).toBe('correct')
    expect(run('R13-draw', [{ type: 'removePiece' }, { type: 'removePiece' }])).toBe('wrong')
    expect(run('R14-draw', [{ type: 'den', den: 4 }, { type: 'removePiece' }])).toBe('correct')
    expect(run('R15-draw', Array(6).fill({ type: 'addPiece' }))).toBe('correct')
    expect(run('R16-draw', [{ type: 'addPiece' }])).toBe('correct')
    expect(run('R17-draw', [{ type: 'den', den: 15 }, ...Array(4).fill({ type: 'removePiece' })])).toBe('correct')
    expect(run('R18-draw', [{ type: 'addPiece' }, { type: 'addPiece' }])).toBe('correct')
  })
})

function gcdOf(a: number, b: number): number {
  return b === 0 ? a : gcdOf(b, a % b)
}

/** The value a reverse item expects, read from its check. */
function grade35(i: Extract<Item, { type: 'reverse' }>) {
  if (i.check.kind !== 'fractionEquals') throw new Error('expected fractionEquals')
  return parse(i.check.target)!
}

describe('Olympiad challenges', () => {
  const frac = (t: string) => parse(t)!
  const ch = (id: string) => challengeOf(id)!
  const status = (id: string, values: Record<string, string | number>) => {
    const g = gradeChallenge(ch(id), values)
    return { ok: g.correct, readable: g.readable, fields: Object.fromEntries(Object.entries(g.fields).map(([k, v]) => [k, v.status])) }
  }

  it('has 8 challenges in the multiplication and division topic and 6 in word-problem models, each with a hint and readable answers', () => {
    expect(CHALLENGES).toHaveLength(14)
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(14)
    expect(challengesIn('muldiv')).toHaveLength(8)
    expect(challengesIn('models')).toHaveLength(6)
    expect(challengesIn('addsub')).toHaveLength(0)
    for (const c of CHALLENGES) {
      expect(c.hints.length, c.id).toBeGreaterThan(0)
      expect(c.explanation.length, c.id).toBeGreaterThan(20)
      expect(c.ruleIds.every((r) => RULES.some((x) => x.id === r)), c.id).toBe(true)
      for (const f of c.fields) {
        if (f.kind === 'number') expect(parse(f.answer), `${c.id} ${f.id}`).not.toBeNull()
        else expect(f.answer).toBeLessThan(f.options.length)
      }
    }
  })

  it('has the right answers (checked with the fraction engine)', () => {
    expect(equals(multiply(frac('3/4'), frac('2/5')), frac('3/10'))).toBe(true) // C1
    const ribbon = divide(frac('3 1/2'), frac('1/4')) // C2
    expect(ribbon.ok && equals(ribbon.value, frac('14'))).toBe(true)
    const snail = divide(frac('6'), frac('2/3')) // C3
    expect(snail.ok && equals(snail.value, frac('9'))).toBe(true)
    expect(equals(multiply(multiply(frac('24'), frac('1/2')), frac('1/2')), frac('6'))).toBe(true) // C4: 24 -> 12 -> 6 left
    expect(equals(multiply(frac('2 1/4'), frac('3 1/2')), frac('7 7/8'))).toBe(true) // C5
    expect(equals(frac('6 1/8'), frac('7 7/8'))).toBe(false)
    expect(equals(multiply(frac('2/5'), frac('1/3')), frac('2/15'))).toBe(true) // C6
    const detective = divide(frac('2/5'), frac('3'))
    expect(detective.ok && equals(detective.value, frac('4/30'))).toBe(true)
    expect(equals(multiply(frac('2/15'), frac('3')), frac('2/5'))).toBe(true)
    expect(4 * 2 + 1).toBe(9) // C7
    const a = frac('2/5')
    const b = frac('9/4')
    expect(equals(multiply(a, b), frac('9/10'))).toBe(true)
    expect(compare(multiply(a, b), frac('1'))).toBeLessThan(0)
    expect(compare(b, frac('1'))).toBeGreaterThan(0)
    expect(parse('9/4') && Math.floor(9 / 4)).toBe(2)
    expect(9 % 4).toBe(1)
  })

  it('C1 to C4: equal forms are accepted, wrong ones are not, and unreadable ones are not counted', () => {
    expect(status('C1', { purple: '3/10' }).ok).toBe(true)
    expect(status('C1', { purple: '6/20' }).ok).toBe(true)
    expect(status('C1', { purple: '3/4' }).ok).toBe(false)
    expect(status('C1', { purple: 'purple' })).toEqual({ ok: false, readable: false, fields: { purple: 'invalid' } })
    expect(status('C1', { purple: '' }).readable).toBe(false)
    expect(status('C2', { bows: '14', left: '0' }).ok).toBe(true)
    expect(status('C2', { bows: '14', left: '1' }).fields).toEqual({ bows: 'correct', left: 'wrong' })
    expect(status('C3', { hours: '9' }).ok).toBe(true)
    expect(status('C3', { hours: '4' }).ok).toBe(false)
    expect(status('C4', { tarts: '24' }).ok).toBe(true)
    expect(status('C4', { tarts: '12' }).ok).toBe(false)
  })

  it('C5: a choice and a length', () => {
    expect(status('C5', { correct: 1, length: '7 7/8' }).ok).toBe(true)
    expect(status('C5', { correct: 1, length: '63/8' }).ok).toBe(true)
    expect(status('C5', { correct: 0, length: '7 7/8' }).fields).toEqual({ correct: 'wrong', length: 'correct' })
    expect(status('C5', { length: '7 7/8' }).readable).toBe(false)
  })

  it('C6 and C7: simplest form is required where the question says so', () => {
    expect(status('C6', { secret: '2/5', whole: '3' }).ok).toBe(true)
    const equalButNotSimplest = gradeChallenge(ch('C6'), { secret: '4/10', whole: '3' })
    expect(equalButNotSimplest.fields.secret).toEqual({ status: 'wrong', message: 'The value is right. Write it in simplest form.' })
    expect(status('C7', { a: '2/5', b: '9/4', product: '9/10' }).ok).toBe(true)
    expect(status('C7', { a: '2/5', b: '18/8', product: '9/10' }).fields.b).toBe('wrong')
    expect(status('C7', { a: '2/5', b: '9/4', product: '18/20' }).ok).toBe(false)
  })

  it('C8: the four digit-card answers match the best arrangement of 2, 3, 4 and 8', () => {
    expect(status('C8', { gp: '37 1/3', sp: '8 3/4', gq: '2 10/11', sq: '8/35' }).ok).toBe(true)
    expect(status('C8', { gp: '112/3', sp: '35/4', gq: '32/11', sq: '8/35' }).ok).toBe(true)
    expect(status('C8', { gp: '37 1/3', sp: '8 3/4', gq: '8/35', sq: '2 10/11' }).ok).toBe(false)
  })

  it('records a challenge: unreadable answers are not saved; wrong ones are; the solved one remembers the first try', async () => {
    setActivePinia(createPinia())
    const rows: Array<Record<string, unknown>> = []
    useSyncStore().configure({
      save: async (row) => (rows.push(row as unknown as Record<string, unknown>), true),
      familyId: async () => 'fam',
      childId: () => 'kid',
    })
    const store = useDeepCheckStore()
    store.openChallenge('C3')
    expect(store.view).toBe('challenge')
    store.submitChallenge({ hours: 'abc' })
    expect(store.challengeTries).toBe(0)
    store.submitChallenge({ hours: '4' }, 1)
    expect(store.challengeResult?.correct).toBe(false)
    expect(store.challengeTries).toBe(1)
    store.tryAgain()
    expect(store.challengeResult).toBeNull()
    store.submitChallenge({ hours: '9' }, 2)
    expect(store.challengeResult?.correct).toBe(true)
    await new Promise((r) => setTimeout(r, 0))
    expect(rows.map((r) => [r.problem, r.correct, r.first_try, r.hints_used])).toEqual([
      ['C3 challenge', false, false, 1],
      ['C3 challenge', true, false, 2],
    ])
    store.openChallenge('nope')
    expect(store.challenge?.id).toBe('C3')
    store.goHome()
    expect(store.challenge).toBeUndefined()
  })

  it('knows which challenges she has solved, and does not mix them with rule stars', () => {
    const lines = [
      { mode: 'deep_check', problem: 'C3 challenge', correct: true },
      { mode: 'deep_check', problem: 'C4 challenge', correct: false },
      { mode: 'deep_check', problem: 'C99 challenge', correct: true },
      { mode: 'practice', problem: 'C1 challenge', correct: true },
    ]
    expect([...challengesSolved(lines)]).toEqual(['C3'])
    const progress = deepCheckProgress(lines)
    expect(Object.values(progress).every((p) => p.tried === 0)).toBe(true)
  })
})

describe('answer boxes do not give the answer away', () => {
  it('every note under an answer box is words only: no example number that could be the answer', () => {
    const notes: string[] = []
    for (const i of ITEMS) if (i.type === 'reverse') notes.push(i.format)
    for (const c of CHALLENGES) for (const f of c.fields) if (f.kind === 'number') notes.push(f.format)
    expect(notes.length).toBeGreaterThan(30)
    for (const note of notes) {
      expect(note.length).toBeGreaterThan(5)
      expect(note, note).not.toMatch(/\d/)
      expect(note, note).not.toMatch(/like|example/i)
    }
  })

  it('no reverse item or challenge field carries a placeholder (the grey example text that vanishes when she types)', () => {
    for (const i of ITEMS) expect('placeholder' in i, i.id).toBe(false)
    for (const c of CHALLENGES) for (const f of c.fields) expect('placeholder' in f, `${c.id} ${f.id}`).toBe(false)
  })
})

describe('one hint per question', () => {
  it('every item has a hint that is a nudge, and none gives the answer away', () => {
    for (const i of ITEMS) {
      expect(i.hint.length, i.id).toBeGreaterThan(20)
      const hint = i.hint.toLowerCase()
      if (i.type === 'asn') expect(hint, i.id).not.toMatch(/\b(always|sometimes|never)\b/)
      if (i.type === 'spotMistake' || i.type === 'oddOneOut') {
        const right = i.options[i.answer]!.toLowerCase()
        expect(hint, i.id).not.toContain(right)
        // it should not simply repeat the correct choice's words either
        expect(hint.includes(right.slice(0, 30)), i.id).toBe(false)
      }
      // For these questions the target IS the answer (for the others the target is in the question).
      if (i.type === 'reverse' && i.check.kind === 'fractionEquals') {
        expect(hint, i.id).not.toContain(i.check.target.toLowerCase())
      }
      if (i.type === 'draw' && 'target' in i) {
        expect(hint, i.id).not.toContain(`${i.target.total}/${i.target.den}`)
      }
    }
  })

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

  it('allows one hint before answering; a right answer with the hint is saved as not first try, with 1 hint used', async () => {
    const { store, rows } = setup()
    store.startRule('R1')
    expect(store.hintShown).toBe(false)
    store.showHint()
    store.showHint()
    expect(store.hintShown).toBe(true)
    store.answerAsn('sometimes')
    expect(store.feedback?.correct).toBe(true)
    expect(store.feedback?.usedHint).toBe(true)
    store.next()
    expect(store.hintShown).toBe(false)
    store.answerChoice(0) // right, no hint
    await flush()
    expect(rows.map((r) => [r.problem, r.correct, r.first_try, r.hints_used])).toEqual([
      ['R1 asn', true, false, 1],
      ['R1 spotMistake', true, true, 0],
    ])
  })

  it('does not give a hint after she has answered', () => {
    const { store } = setup()
    store.startRule('R1')
    store.answerAsn('always')
    store.showHint()
    expect(store.hintShown).toBe(false)
  })

  it('a right answer with a hint earns no star; without a hint it does', () => {
    const lines = [
      { mode: 'deep_check', problem: 'R1 asn', correct: true, first_try: false },
      { mode: 'deep_check', problem: 'R1 spotMistake', correct: true, first_try: true },
      { mode: 'deep_check', problem: 'R1 oddOneOut', correct: true },
    ]
    const progress = deepCheckProgress(lines)
    expect(progress.R1).toEqual({ stars: 2, tried: 3, right: 3 })
  })
})


describe('word-problem models (R19 to R21)', () => {
  const quiz = (id: string) => ITEMS.find((i) => i.id === id)!

  it('the right answers match the fraction engine', () => {
    // R19: 1/4 of the 1/3 not in the choir is 1/12; 1/4 of 2/3 is 1/6 (the odd one out)
    expect(equals(multiply(num('1/4'), subtract(num('1'), num('2/3'))), num('1/12'))).toBe(true)
    expect(equals(multiply(num('1/4'), num('2/3')), num('1/6'))).toBe(true)
    // R20: 18 is 3/5 of the coins, so there were 30; three of the options give 30, one does not
    const whole = divide(num('18'), num('3/5'))
    expect(whole.ok && equals(whole.value, num('30'))).toBe(true)
    expect(equals(multiply(num('18'), num('5/3')), num('30'))).toBe(true)
    expect(equals(multiply(num('18'), num('3/5')), num('30'))).toBe(false)
    // R21: 1/5 lasts 2 days, so all of it lasts 10; 2 x 1/5 is not 10
    const days = divide(num('2'), num('1/5'))
    expect(days.ok && equals(days.value, num('10'))).toBe(true)
    expect(equals(multiply(num('2'), num('1/5')), num('10'))).toBe(false)
    // R20 spot: the tank is 30 / (3/4) = 40 litres, not 30 x 3/4
    const tank = divide(num('30'), num('3/4'))
    expect(tank.ok && equals(tank.value, num('40'))).toBe(true)
    // R21 spot: 4 / (1/3) = 12 days
    const juice = divide(num('4'), num('1/3'))
    expect(juice.ok && equals(juice.value, num('12'))).toBe(true)
  })

  it('names the wrong option in each "which one does not" item', () => {
    expect((quiz('R19-odd') as Extract<Item, { type: 'oddOneOut' }>).options[2]).toBe('1/4 × 2/3')
    expect((quiz('R20-odd') as Extract<Item, { type: 'oddOneOut' }>).options[2]).toBe('18 × 3/5')
    expect((quiz('R21-odd') as Extract<Item, { type: 'oddOneOut' }>).options[2]).toBe('2 × 1/5')
  })

  it('grades the "reverse it" answers', () => {
    const r = (id: string) => (quiz(id) as Extract<Item, { type: 'reverse' }>).check
    expect(gradeReverse(r('R19-rev'), '1/12').status).toBe('correct')
    expect(gradeReverse(r('R19-rev'), '2/24').status).toBe('correct')
    expect(gradeReverse(r('R19-rev'), '1/6').status).toBe('wrong')
    expect(gradeReverse(r('R20-rev'), '3/5').status).toBe('correct')
    expect(gradeReverse(r('R21-rev'), '10').status).toBe('correct')
    expect(gradeReverse(r('R21-rev'), '5').status).toBe('wrong')
  })

  it('grades a drawn bar model by its cuts and its colour groups, in any colours', () => {
    const target = (id: string) => (quiz(id) as Extract<Item, { type: 'draw'; model: unknown }>).model as Parameters<typeof gradeModel>[0]
    const nine = Array<number | null>(9).fill(0)
    // R19: 12 parts, 9 in one colour and 1 in another
    expect(gradeModel(target('R19-draw'), [...nine, 1, null, null]).status).toBe('correct')
    expect(gradeModel(target('R19-draw'), [...nine.map(() => 3), 2, null, null]).status).toBe('correct')
    expect(gradeModel(target('R19-draw'), [...nine, 1, 1, null]).status).toBe('wrong')
    expect(gradeModel(target('R19-draw'), [...nine, 1]).status).toBe('wrong')
    expect(gradeModel(target('R19-draw'), Array(12).fill(null)).status).toBe('wrong')
    // R20: 5 parts, 2 coloured
    expect(gradeModel(target('R20-draw'), [0, 0, null, null, null]).status).toBe('correct')
    // R21: 10 day blocks, 2 coloured
    expect(gradeModel(target('R21-draw'), [1, 1, ...Array(8).fill(null)]).status).toBe('correct')
    expect(gradeModel(target('R21-draw'), [1, 1, null, null, null]).status).toBe('wrong')
  })

  it('each rule shows a picture built by code', () => {
    for (const id of ['R19', 'R20', 'R21']) {
      for (const frame of ruleOf(id)!.frames) {
        expect(frame.kind).toBe('model')
        if (frame.kind === 'model') expect(modelStage(frame.sample, frame.step), `${id} ${frame.sample} ${frame.step}`).not.toBeNull()
      }
    }
  })

  it('the challenge answers match the fraction engine', () => {
    const f = (t: string) => toFraction(parseMixed(t)!)
    // C9: 1/4 of 3/5 = 3/20; not sold 1 - 2/5 - 3/20 = 9/20
    expect(equals(multiply(f('1/4'), f('3/5')), f('3/20'))).toBe(true)
    expect(equals(subtract(subtract(f('1'), f('2/5')), f('3/20')), f('9/20'))).toBe(true)
    // C10: 5/8 - 2/5 of 5/8 - 1/5 of 5/8 = 1/4
    const rest = f('5/8')
    expect(equals(subtract(subtract(rest, multiply(f('2/5'), rest)), multiply(f('1/5'), rest)), f('1/4'))).toBe(true)
    // C11: 24 is 1/3 of the apples (1/2 left, 2/3 of that left) so 72
    expect(equals(multiply(f('1/2'), f('2/3')), f('1/3'))).toBe(true)
    // C12: 4/5 left, game 3/8 of that = 3/10, left 1/2, so $50
    expect(equals(subtract(f('4/5'), multiply(f('3/8'), f('4/5'))), f('1/2'))).toBe(true)
    // C13: 1/5 in 2 hours -> 10 hours; 5 hours left holds 6 L -> 6/5 per hour -> 12
    // C14: 1/6 in 2 days -> 12 days; 6 days left hold 4 1/2 kg -> 3/4 per day -> 9
    const perDay = divide(f('4 1/2'), f('6'))
    expect(perDay.ok && equals(perDay.value, f('3/4'))).toBe(true)
    expect(gradeChallenge(challengeOf('C11')!, { total: '72' }).correct).toBe(true)
    expect(gradeChallenge(challengeOf('C12')!, { total: '50' }).correct).toBe(true)
    expect(gradeChallenge(challengeOf('C13')!, { total: '12' }).correct).toBe(true)
    expect(gradeChallenge(challengeOf('C14')!, { total: '9' }).correct).toBe(true)
    expect(gradeChallenge(challengeOf('C9')!, { sat: '3/20', left: '9/20' }).correct).toBe(true)
    expect(gradeChallenge(challengeOf('C9')!, { sat: '6/40', left: '9/20' }).correct).toBe(false)
    expect(gradeChallenge(challengeOf('C10')!, { left: '1/4' }).correct).toBe(true)
    expect(gradeChallenge(challengeOf('C14')!, { total: '4.5' }).correct).toBe(false)
  })

  it('plays the draw model in a quiz through the store', () => {
    setActivePinia(createPinia())
    const store = useDeepCheckStore()
    store.startRule('R20')
    // The R20 draw item is the fifth question of its rule quiz.
    for (let i = 0; i < 4; i++) {
      const item = store.current!
      if (item.type === 'asn') store.answerAsn('always')
      else if (item.type === 'spotMistake' || item.type === 'oddOneOut') store.answerChoice(item.answer)
      else if (item.type === 'reverse') store.answerReverse('3/5')
      store.next()
    }
    expect(store.current!.id).toBe('R20-draw')
    expect(store.answerModel([0, 0, null, null, null]).status).toBe('correct')
  })
})
