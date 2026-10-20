import { describe, expect, it } from 'vitest'
import { daysBetween, daysLeftInWeek, orderToday, todayString, weekStartIso, type TodayContext, type TodayTask } from '../app/utils/todayPlan'
import { skillOf, summarize, type AttemptLine } from '../app/utils/summary'

const ctx = (over: Partial<TodayContext> = {}): TodayContext => ({
  today: '2026-10-20',
  screenTimeDay: false,
  mapDoneThisWeek: 0,
  daysLeftInWeek: 6,
  ...over,
})
let n = 0
const task = (kind: TodayTask['kind'], over: Partial<TodayTask> = {}): TodayTask => ({
  id: `t${++n}`,
  kind,
  title: kind,
  due: null,
  done: false,
  done_at: null,
  priority: null,
  priority_date: null,
  created_at: `2026-10-1${n % 10}T00:00:00Z`,
  ...over,
})
const kinds = (tasks: TodayTask[], c: TodayContext) => orderToday(tasks, c).open.map((t) => t.kind)

describe('today order', () => {
  const all = () => [task('reading'), task('olympiad'), task('homework'), task('ixl'), task('map'), task('testPrep')]

  it('puts IXL first on a screen-time day and reading last', () => {
    const order = kinds(all(), ctx({ screenTimeDay: true }))
    expect(order[0]).toBe('ixl')
    expect(order.at(-1)).toBe('reading')
    expect(order.indexOf('homework')).toBeGreaterThan(0)
  })

  it('moves IXL back when it is not a screen-time day', () => {
    const order = kinds(all(), ctx())
    expect(order.indexOf('ixl')).toBeGreaterThan(order.indexOf('homework'))
    expect(order.at(-1)).toBe('reading')
  })

  it('moves test prep up as the test gets near', () => {
    const far = kinds([task('homework'), task('testPrep', { due: '2026-11-20' })], ctx())
    const near = kinds([task('homework'), task('testPrep', { due: '2026-10-22' })], ctx())
    expect(far[0]).toBe('homework')
    expect(near[0]).toBe('testPrep')
  })

  it('moves MAP up when she is behind for the week, and back when she has done 3', () => {
    const calm = kinds([task('map'), task('homework')], ctx({ mapDoneThisWeek: 0, daysLeftInWeek: 6 }))
    const behind = kinds([task('map'), task('homework')], ctx({ mapDoneThisWeek: 1, daysLeftInWeek: 2 }))
    const enough = kinds([task('map'), task('homework'), task('olympiad')], ctx({ mapDoneThisWeek: 3 }))
    expect(calm[0]).toBe('homework')
    expect(behind[0]).toBe('map')
    expect(enough.at(-1)).toBe('map')
  })

  it('puts a parent pick for today first, but not a pick from another day', () => {
    const a = task('homework')
    const b = task('reading', { priority: 1, priority_date: '2026-10-20' })
    const c = task('olympiad', { priority: 1, priority_date: '2026-10-19' })
    const order = orderToday([a, b, c], ctx()).open
    expect(order[0]!.id).toBe(b.id)
    expect(order[0]!.reason).toMatch(/parent/i)
    expect(order.map((t) => t.kind)).toEqual(['reading', 'homework', 'olympiad'])
  })

  it('keeps finished tasks apart and breaks ties by due date', () => {
    const done = task('ixl', { done: true })
    const later = task('homework', { due: '2026-10-25' })
    const sooner = task('homework', { due: '2026-10-23' })
    const result = orderToday([done, later, sooner], ctx())
    expect(result.done).toEqual([done])
    expect(result.open.map((t) => t.id)).toEqual([sooner.id, later.id])
  })

  it('does date math', () => {
    expect(daysBetween('2026-10-20', '2026-10-23')).toBe(3)
    expect(daysBetween('2026-10-20', '2026-10-19')).toBe(-1)
    expect(todayString(new Date(2026, 9, 5))).toBe('2026-10-05')
    expect(daysLeftInWeek(new Date(2026, 9, 19))).toBe(7) // Monday
    expect(daysLeftInWeek(new Date(2026, 9, 25))).toBe(1) // Sunday
    expect(new Date(weekStartIso(new Date(2026, 9, 21))).getDay()).toBe(1)
  })
})

describe('5-minute summary', () => {
  const line = (over: Partial<AttemptLine>): AttemptLine => ({
    mode: 'practice',
    problem: '8 1/5 - 4 3/4',
    correct: true,
    first_try: true,
    hints_used: 0,
    error_type: null,
    ...over,
  })

  it('names skills from the saved text', () => {
    expect(skillOf('8 1/5 - 4 3/4')).toBe('Subtracting mixed numbers')
    expect(skillOf('1/2 + 1/3')).toBe('Adding fractions with unlike denominators')
    expect(skillOf('1/4 + 1/4')).toBe('Adding fractions')
    expect(skillOf('3/4 × 2/5')).toBe('Multiplying fractions')
    expect(skillOf('2 ÷ 1/2')).toBe('Dividing fractions')
    expect(skillOf('nonsense')).toBeNull()
    expect(skillOf(null)).toBeNull()
  })

  it('counts done, struggled, tutor, mastered rules and mistake patterns', () => {
    const lines = [
      line({}), line({}), line({}),
      line({ problem: '1/2 + 1/3', first_try: false, hints_used: 2, error_type: 'addedDenominators' }),
      line({ problem: '1/2 + 1/3', correct: false, first_try: false, error_type: 'addedDenominators' }),
      line({ problem: '2/3 × 3/4', mode: 'tutor', hints_used: 1, error_type: 'forgotReciprocal' }),
      line({ problem: '3/4 × 2/5', mode: 'tutor' }),
    ]
    const s = summarize(lines)
    expect(s.total).toBe(7)
    expect(s.struggled).toBe(3)
    expect(s.smooth).toBe(4)
    expect(s.tutor).toBe(2)
    expect(s.mastered).toEqual(['Subtracting mixed numbers'])
    expect(s.needsPractice).toEqual(['Adding fractions with unlike denominators', 'Multiplying fractions'])
    expect(s.patterns[0]).toEqual({ text: 'Adding the bottom numbers', count: 2 })
  })

  it('handles no attempts', () => {
    expect(summarize([])).toEqual({ total: 0, smooth: 0, struggled: 0, tutor: 0, mastered: [], needsPractice: [], patterns: [] })
  })
})

describe('notes and unseen tasks', () => {
  it('keeps the note and the unseen flag on the task and does not change the order', () => {
    const a = task('homework', { note: 'Do this first', seen_by_parent: false, added_by: 'child' })
    const b = task('olympiad')
    const result = orderToday([b, a], ctx())
    expect(result.open.map((t) => t.id)).toEqual([a.id, b.id])
    expect(result.open[0]!.note).toBe('Do this first')
    expect(result.open[0]!.seen_by_parent).toBe(false)
  })
})

import { DEFAULT_TEMPLATES, isOnList, missingDefaults, taskTitle } from '../app/utils/taskTemplates'

describe('usual tasks', () => {
  it('builds the title from the template and what she typed', () => {
    const t = { title: 'Math homework book' }
    expect(taskTitle(t, 'pages 45 to 47')).toBe('Math homework book: pages 45 to 47')
    expect(taskTitle(t, '  ')).toBe('Math homework book')
    expect(taskTitle(t, 'a'.repeat(300))).toHaveLength(120)
    expect(taskTitle(t, 'pages   1   to 2')).toBe('Math homework book: pages 1 to 2')
  })

  it('knows when a task is already on her list', () => {
    const t = { title: 'IXL' }
    expect(isOnList(t, ['IXL'])).toBe(true)
    expect(isOnList(t, ['IXL: skill 5'])).toBe(true)
    expect(isOnList(t, ['IXLE'])).toBe(false)
    expect(isOnList(t, [])).toBe(false)
  })

  it('adds only the defaults the family does not have yet', () => {
    expect(missingDefaults([])).toHaveLength(DEFAULT_TEMPLATES.length)
    const left = missingDefaults([{ title: 'ixl' }, { title: 'Reading' }])
    expect(left.map((d) => d.title)).not.toContain('IXL')
    expect(left).toHaveLength(DEFAULT_TEMPLATES.length - 2)
  })

  it('the usual set covers the kinds in her week', () => {
    const kinds = new Set(DEFAULT_TEMPLATES.map((d) => d.kind))
    for (const k of ['ixl', 'homework', 'reading', 'olympiad', 'map']) expect(kinds.has(k as never)).toBe(true)
    expect(DEFAULT_TEMPLATES.find((d) => d.ask_detail)?.title).toBe('Math homework book')
  })
})

import { formatClock, startClock } from '../app/utils/todayPlan'

describe('start time', () => {
  it('shows a clock the way she reads it', () => {
    expect(formatClock('16:30:00')).toBe('4:30 pm')
    expect(formatClock('07:05')).toBe('7:05 am')
    expect(formatClock('00:10:00')).toBe('12:10 am')
    expect(formatClock('12:00:00')).toBe('12:00 pm')
    expect(formatClock('25:00')).toBe('')
    expect(formatClock(null)).toBe('')
  })

  it('shows a start time only for the day the parent set it', () => {
    expect(startClock({ start_time: '16:30:00', priority_date: '2026-10-20' }, '2026-10-20')).toBe('4:30 pm')
    expect(startClock({ start_time: '16:30:00', priority_date: '2026-10-19' }, '2026-10-20')).toBe('')
    expect(startClock({ start_time: null, priority_date: '2026-10-20' }, '2026-10-20')).toBe('')
  })
})

import { orderDay } from '../app/utils/todayPlan'

describe('the day as one list', () => {
  it('keeps a ticked task where it was, so the list does not jump', () => {
    const a = task('homework')
    const b = task('olympiad')
    const c = task('reading')
    const before = orderDay([c, b, a], ctx()).map((t) => t.id)
    a.done = true
    const after = orderDay([c, b, a], ctx()).map((t) => t.id)
    expect(after).toEqual(before)
    expect(orderDay([c, b, a], ctx()).find((t) => t.id === a.id)!.done).toBe(true)
  })
})

import { carriedLabel } from '../app/utils/todayPlan'

describe('carried over tasks', () => {
  it('says how long a task has been waiting', () => {
    expect(carriedLabel(new Date(2026, 9, 20, 15).toISOString(), '2026-10-20')).toBe('')
    expect(carriedLabel(new Date(2026, 9, 19, 15).toISOString(), '2026-10-20')).toBe('From yesterday')
    expect(carriedLabel(new Date(2026, 9, 17, 15).toISOString(), '2026-10-20')).toBe('From 3 days ago')
  })
})

import { CARRY_DAYS, ageDays, carriedText, defaultCategory, dueText, splitOpen, taskState } from '../app/utils/todayPlan'

describe('categories and the carry-over rule', () => {
  const T = '2026-10-20'
  const make = (kind: TodayTask['kind'], forDate: string, over: Partial<TodayTask> = {}) =>
    task(kind, { for_date: forDate, category: defaultCategory(kind), ...over })

  it('picks a usual category for each kind', () => {
    expect(defaultCategory('ixl')).toBe('routine')
    expect(defaultCategory('reading')).toBe('routine')
    expect(defaultCategory('map')).toBe('routine')
    expect(defaultCategory('testPrep')).toBe('timed')
    expect(defaultCategory('olympiad')).toBe('timed')
    expect(defaultCategory('homework')).toBe('important')
  })

  it('routine tasks expire after their day', () => {
    expect(taskState(make('ixl', T), T)).toBe('active')
    expect(taskState(make('ixl', '2026-10-19'), T)).toBe('expired')
  })

  it('timed tasks last until the due date and then expire', () => {
    expect(taskState(make('testPrep', '2026-10-10', { due: '2026-10-20' }), T)).toBe('active')
    expect(taskState(make('testPrep', '2026-10-10', { due: '2026-10-19' }), T)).toBe('expired')
    expect(taskState(make('olympiad', T, { due: null }), T)).toBe('expired')
  })

  it('important tasks carry over for 3 days and then go to the backlog', () => {
    expect(CARRY_DAYS).toBe(3)
    expect(taskState(make('homework', '2026-10-17'), T)).toBe('active')
    expect(taskState(make('homework', '2026-10-16'), T)).toBe('backlog')
    expect(ageDays({ for_date: '2026-10-18', created_at: '2026-10-01T00:00:00Z' }, T)).toBe(2)
    expect(carriedText(0)).toBe('')
    expect(carriedText(1)).toBe('From yesterday')
    expect(carriedText(2)).toBe('From 2 days ago')
  })

  it('splits open tasks into today, carried and backlog, and drops expired ones', () => {
    const today = make('homework', T)
    const carried = make('homework', '2026-10-18')
    const backlog = make('homework', '2026-10-10')
    const expiredRoutine = make('reading', '2026-10-19')
    const pinned = make('homework', '2026-10-18', { priority: 1, priority_date: T })
    const done = make('homework', T, { done: true })
    const parts = splitOpen([today, carried, backlog, expiredRoutine, pinned, done], T)
    expect(parts.list.map((t) => t.id).sort()).toEqual([today.id, pinned.id].sort())
    expect(parts.carried.map((t) => t.id)).toEqual([carried.id])
    expect(parts.backlog.map((t) => t.id)).toEqual([backlog.id])
  })

  it('writes a due date for her to read', () => {
    expect(dueText('2026-10-24')).toMatch(/^Due /)
    expect(dueText(null)).toBe('')
  })
})
