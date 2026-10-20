import type { TaskCategory, TaskKind } from './todayPlan'

export interface TaskTemplate {
  id: string
  kind: TaskKind
  title: string
  minutes: number | null
  /** She types the page numbers (or other detail) each time. */
  ask_detail: boolean
  category: TaskCategory
  /** A daily routine that is added to her list every day by itself. */
  repeat_daily: boolean
  sort_order: number
}

export type NewTemplate = Omit<TaskTemplate, 'id' | 'sort_order'>

/** The usual set a parent can add with one tap, then change. Written to match a typical week, not copied from any book. */
export const DEFAULT_TEMPLATES: NewTemplate[] = [
  { kind: 'ixl', title: 'IXL', minutes: null, ask_detail: false, category: 'routine', repeat_daily: true },
  { kind: 'homework', title: 'Math homework book', minutes: null, ask_detail: true, category: 'important', repeat_daily: false },
  { kind: 'reading', title: 'Reading', minutes: 30, ask_detail: false, category: 'routine', repeat_daily: true },
  { kind: 'homework', title: 'Write a summary of the novel', minutes: null, ask_detail: false, category: 'important', repeat_daily: false },
  { kind: 'olympiad', title: 'Olympiad practice', minutes: null, ask_detail: false, category: 'timed', repeat_daily: false },
  { kind: 'map', title: 'MAP practice', minutes: 30, ask_detail: false, category: 'routine', repeat_daily: false },
]

const MAX_TITLE = 120

/** The task title she ends up with: "Math homework book: pages 45 to 47". */
export function taskTitle(template: Pick<TaskTemplate, 'title'>, detail: string): string {
  const extra = detail.trim().replace(/\s+/g, ' ')
  const full = extra ? `${template.title}: ${extra}` : template.title
  return full.slice(0, MAX_TITLE)
}

/** True when an open task already came from this template (so the button can show it is on her list). */
export function isOnList(template: Pick<TaskTemplate, 'title'>, openTitles: string[]): boolean {
  return openTitles.some((t) => t === template.title || t.startsWith(`${template.title}: `))
}

/** Which defaults the family does not have yet, by title. */
export function missingDefaults(existing: Pick<TaskTemplate, 'title'>[]): NewTemplate[] {
  const have = new Set(existing.map((t) => t.title.toLowerCase()))
  return DEFAULT_TEMPLATES.filter((d) => !have.has(d.title.toLowerCase()))
}
