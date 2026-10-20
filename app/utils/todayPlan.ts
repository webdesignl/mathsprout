/**
 * Today's checklist order. Code decides the order from fixed rules; a parent's pick for today comes first.
 * Rules: IXL first on screen-time days; homework in between; MAP skills 3 times a week (moved up when she is
 * behind); test prep moves up as the test gets near; reading is last, as part of the bedtime story routine.
 */
export type TaskKind = 'ixl' | 'homework' | 'map' | 'olympiad' | 'testPrep' | 'reading'

export const TASK_KINDS: { kind: TaskKind; label: string }[] = [
  { kind: 'ixl', label: 'IXL' },
  { kind: 'homework', label: 'Homework' },
  { kind: 'map', label: 'MAP skills' },
  { kind: 'olympiad', label: 'Olympiad set' },
  { kind: 'testPrep', label: 'Test prep' },
  { kind: 'reading', label: 'Bedtime reading' },
]

export const MAP_PER_WEEK = 3

export interface TodayTask {
  id: string
  kind: TaskKind
  title: string
  /** Date as YYYY-MM-DD (a test date for test prep, a due date for homework). */
  due: string | null
  done: boolean
  done_at: string | null
  priority: number | null
  priority_date: string | null
  created_at: string
  minutes?: number | null
  /** The parent's start time for today, like "16:30:00". Counts only when priority_date is today. */
  start_time?: string | null
  /** A parent's short note for her. */
  note?: string | null
  /** false while a task she added waits for a parent to look at it. */
  seen_by_parent?: boolean
  added_by?: string
}

export interface TodayContext {
  /** Today as YYYY-MM-DD. */
  today: string
  screenTimeDay: boolean
  /** MAP tasks she finished since Monday. */
  mapDoneThisWeek: number
  /** Days left in the week, counting today (Monday = 7, Sunday = 1). */
  daysLeftInWeek: number
}

export interface OrderedTask extends TodayTask {
  /** A few words on why it sits here, shown small under the title. */
  reason: string
}

export function kindLabel(kind: string): string {
  return TASK_KINDS.find((k) => k.kind === kind)?.label ?? 'Task'
}

/** Today as YYYY-MM-DD in the device's own time zone. */
export function todayString(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Whole days from a to b, both YYYY-MM-DD. Negative when b is before a. */
export function daysBetween(a: string, b: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return Date.UTC(y!, m! - 1, d!)
  }
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000)
}

/** Monday = 7 days left, Sunday = 1. */
export function daysLeftInWeek(now: Date = new Date()): number {
  return 7 - ((now.getDay() + 6) % 7)
}

/** The start of this week (Monday, 00:00 local) as an ISO time, for counting this week's MAP tasks. */
export function weekStartIso(now: Date = new Date()): string {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  return start.toISOString()
}

interface Ranked {
  rank: number
  reason: string
}

/** Lower rank = earlier. Ranks are spaced so the rules read like a list. */
export function rankOf(task: TodayTask, ctx: TodayContext): Ranked {
  if (task.priority !== null && task.priority_date === ctx.today) {
    return { rank: -1000 + task.priority, reason: 'A parent picked this order' }
  }
  switch (task.kind) {
    case 'ixl':
      return ctx.screenTimeDay
        ? { rank: 0, reason: 'Screen-time day: IXL first' }
        : { rank: 60, reason: 'IXL waits for a screen-time day' }
    case 'testPrep': {
      if (task.due === null) return { rank: 55, reason: 'Test prep' }
      const left = daysBetween(ctx.today, task.due)
      if (left < 0) return { rank: 10, reason: 'The test date has passed' }
      if (left === 0) return { rank: 10, reason: 'Test today' }
      if (left <= 2) return { rank: 10, reason: `Test in ${left} day${left === 1 ? '' : 's'}` }
      if (left <= 5) return { rank: 22, reason: `Test in ${left} days` }
      if (left <= 10) return { rank: 35, reason: `Test in ${left} days` }
      return { rank: 55, reason: `Test in ${left} days` }
    }
    case 'map': {
      const needed = MAP_PER_WEEK - ctx.mapDoneThisWeek
      if (needed <= 0) return { rank: 80, reason: `MAP done ${MAP_PER_WEEK} times this week` }
      if (needed >= ctx.daysLeftInWeek) return { rank: 20, reason: `MAP ${ctx.mapDoneThisWeek} of ${MAP_PER_WEEK} this week: time to catch up` }
      return { rank: 40, reason: `MAP ${ctx.mapDoneThisWeek} of ${MAP_PER_WEEK} this week` }
    }
    case 'homework': {
      const late = task.due !== null && daysBetween(ctx.today, task.due) <= 0
      return late ? { rank: 15, reason: 'Homework due' } : { rank: 30, reason: 'Homework' }
    }
    case 'olympiad':
      return { rank: 50, reason: 'Olympiad set' }
    case 'reading':
      return { rank: 90, reason: 'Last: part of the bedtime story' }
  }
}

/** "16:30:00" or "16:30" -> "4:30 pm". Anything else gives an empty string. */
export function formatClock(value: string | null | undefined): string {
  const m = value?.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return ''
  const h = Number(m[1])
  const min = m[2]
  if (h > 23 || Number(min) > 59) return ''
  return `${h % 12 === 0 ? 12 : h % 12}:${min} ${h < 12 ? 'am' : 'pm'}`
}

/** The start time a parent set for today, as a clock; empty when none or when it was set for another day. */
export function startClock(task: Pick<TodayTask, 'start_time' | 'priority_date'>, today: string): string {
  return task.priority_date === today ? formatClock(task.start_time) : ''
}

/** "From yesterday" or "From 3 days ago" for a task still open from an earlier day; empty for today's own tasks. */
export function carriedLabel(createdAt: string, today: string): string {
  const created = todayString(new Date(createdAt))
  const days = daysBetween(created, today)
  if (days <= 0) return ''
  return days === 1 ? 'From yesterday' : `From ${days} days ago`
}

/** Open tasks in order, then the ones she already finished. */
export function orderToday(tasks: TodayTask[], ctx: TodayContext): { open: OrderedTask[]; done: TodayTask[] } {
  const open = tasks
    .filter((t) => !t.done)
    .map((t) => ({ t, r: rankOf(t, ctx) }))
    .sort((a, b) => a.r.rank - b.r.rank || (a.t.due ?? '9999').localeCompare(b.t.due ?? '9999') || a.t.created_at.localeCompare(b.t.created_at))
    .map(({ t, r }) => ({ ...t, reason: r.reason }))
  return { open, done: tasks.filter((t) => t.done) }
}

/**
 * The whole day as one list, like a shopping list: finished tasks stay where they were, ticked and crossed out.
 * Positions do not change when she ticks something, because the rules count MAP only up to this morning.
 */
export function orderDay(tasks: TodayTask[], ctx: TodayContext): OrderedTask[] {
  return tasks
    .map((t) => ({ t, r: rankOf(t, ctx) }))
    .sort((a, b) => a.r.rank - b.r.rank || (a.t.due ?? '9999').localeCompare(b.t.due ?? '9999') || a.t.created_at.localeCompare(b.t.created_at))
    .map(({ t, r }) => ({ ...t, reason: r.reason }))
}
