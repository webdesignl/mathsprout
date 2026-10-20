import type { Database } from '../types/database.types'
import {
  daysLeftInWeek,
  orderDay,
  orderToday,
  todayString,
  weekStartIso,
  type TaskKind,
  type TodayContext,
  type TodayTask,
} from '../utils/todayPlan'

/**
 * Today's tasks for one child. Reads and writes go through Supabase with the signed-in session, so the database
 * decides what is allowed: she can add and tick tasks; the order, the screen-time day and deleting need parent mode.
 */
export function useTodayData(childId: Ref<string | null>) {
  const client = useSupabaseClient<Database>()

  const tasks = ref<TodayTask[]>([])
  const screenTimeDay = ref(false)
  const mapDoneThisWeek = ref(0)
  const loaded = ref(false)
  /** When she finished the whole day (if she did), and whether a parent has looked at it. */
  const dayDoneAt = ref<string | null>(null)
  const dayDoneSeen = ref(true)
  /** A parent gave today's star. */
  const dayStar = ref(false)
  const failed = ref(false)
  const today = ref(todayString())
  /** Shared with the header badge on the Parent link. */
  const unseenTasks = useState<number>('unseen-tasks', () => 0)
  const unseenCompletions = useState<number>('unseen-completions', () => 0)

  const context = computed<TodayContext>(() => ({
    today: today.value,
    screenTimeDay: screenTimeDay.value,
    mapDoneThisWeek: mapDoneThisWeek.value,
    daysLeftInWeek: daysLeftInWeek(),
  }))
  const ordered = computed(() => orderToday(tasks.value, context.value))
  /** The whole day in one list: finished tasks stay in place, crossed out. */
  const day = computed(() => orderDay(tasks.value, context.value))
  const allDone = computed(() => tasks.value.length > 0 && tasks.value.every((t) => t.done))

  async function load() {
    failed.value = false
    today.value = todayString()
    const id = childId.value
    if (!id) return
    const midnight = new Date()
    midnight.setHours(0, 0, 0, 0)
    const [open, doneToday, plan, map] = await Promise.all([
      client.from('tasks').select('*').eq('child_id', id).eq('done', false).order('created_at'),
      client.from('tasks').select('*').eq('child_id', id).eq('done', true).gte('done_at', midnight.toISOString()),
      client.from('daily_plans').select('screen_time_day, completed_at, completion_seen').eq('child_id', id).eq('plan_date', today.value).maybeSingle(),
      client.from('tasks').select('id', { count: 'exact', head: true }).eq('child_id', id).eq('kind', 'map').eq('done', true).gte('done_at', weekStartIso()).lt('done_at', midnight.toISOString()),
    ])
    if (open.error || doneToday.error) {
      failed.value = true
      return
    }
    tasks.value = [...open.data, ...doneToday.data] as TodayTask[]
    screenTimeDay.value = plan.data?.screen_time_day ?? false
    dayDoneAt.value = plan.data?.completed_at ?? null
    dayDoneSeen.value = plan.data?.completion_seen ?? true
    mapDoneThisWeek.value = map.count ?? 0
    loaded.value = true
    const unseen = await client.from('tasks').select('id', { count: 'exact', head: true }).eq('seen_by_parent', false).eq('done', false)
    if (!unseen.error) unseenTasks.value = unseen.count ?? 0
    const star = await client.from('awards').select('id', { count: 'exact', head: true }).eq('child_id', id).eq('kind', 'day_done').eq('award_date', today.value)
    dayStar.value = !star.error && (star.count ?? 0) > 0
    const finished = await client.from('daily_plans').select('id', { count: 'exact', head: true }).eq('completion_seen', false)
    if (!finished.error) unseenCompletions.value = finished.count ?? 0
  }

  /**
   * She ticks a task done. It shows ticked at once (and stays in place, crossed out); if saving fails it goes back.
   * After the last task, the database is asked to tell the parent that the day is finished.
   */
  async function complete(taskId: string): Promise<boolean> {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task) return false
    task.done = true
    task.done_at = new Date().toISOString()
    const { error } = await client.rpc('complete_task', { task_id: taskId })
    if (error) {
      task.done = false
      task.done_at = null
      return false
    }
    if (allDone.value && childId.value) {
      const { data } = await client.rpc('report_day_done', { child_id: childId.value, plan_date: today.value })
      if (data === true) {
        dayDoneAt.value = new Date().toISOString()
        dayDoneSeen.value = false
      }
    }
    return true
  }

  /** Unticks a task, like crossing something back in. A "day finished" report is taken back. */
  async function uncomplete(taskId: string): Promise<boolean> {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task) return false
    task.done = false
    const { error } = await client.rpc('uncomplete_task', { task_id: taskId })
    if (error) {
      task.done = true
      return false
    }
    task.done_at = null
    dayDoneAt.value = null
    dayDoneSeen.value = true
    return true
  }

  /** A parent gives the star for a finished day. The database refuses it unless parent mode is on. */
  async function giveDayStar(): Promise<boolean> {
    if (!childId.value) return false
    const { error } = await client.rpc('give_day_star', { child_id: childId.value, plan_date: today.value })
    if (error) return false
    dayStar.value = true
    if (!dayDoneSeen.value) {
      dayDoneSeen.value = true
      unseenCompletions.value = Math.max(0, unseenCompletions.value - 1)
    }
    return true
  }

  /** A parent has seen that she finished the day. */
  async function markDaySeen(): Promise<boolean> {
    if (!childId.value) return false
    const { data, error } = await client
      .from('daily_plans')
      .update({ completion_seen: true })
      .eq('child_id', childId.value)
      .eq('plan_date', today.value)
      .select('id')
    const ok = !error && (data?.length ?? 0) > 0
    if (ok) {
      dayDoneSeen.value = true
      unseenCompletions.value = Math.max(0, unseenCompletions.value - 1)
    }
    return ok
  }

  /** She (or a parent) adds a task. */
  async function add(kind: TaskKind, title: string, due: string | null, minutes?: number | null): Promise<boolean> {
    if (!childId.value) return false
    const { error } = await client.rpc('add_task', { child_id: childId.value, kind, title, due: due ?? undefined, minutes: minutes ?? undefined })
    if (!error) await load()
    return !error
  }

  // ---- Parent only: the database refuses these unless parent mode is on ----

  async function setScreenTimeDay(value: boolean): Promise<boolean> {
    const { data: family } = await client.rpc('my_family_id')
    if (!childId.value || typeof family !== 'string') return false
    const { error } = await client
      .from('daily_plans')
      .upsert({ family_id: family, child_id: childId.value, plan_date: today.value, screen_time_day: value }, { onConflict: 'child_id,plan_date' })
    if (!error) screenTimeDay.value = value
    return !error
  }

  /** Saves the order shown (1 = first) as today's pick. */
  async function saveOrder(ids: string[], times: Record<string, string> = {}): Promise<boolean> {
    // Setting the order means the parent has looked at everything on the list.
    const results = await Promise.all(
      ids.map((id, i) => client.from('tasks').update({ priority: i + 1, priority_date: today.value, seen_by_parent: true, start_time: times[id] ? times[id] : null }).eq('id', id).select('id')),
    )
    const ok = results.every((r) => !r.error && (r.data?.length ?? 0) > 0)
    if (ok) await load()
    return ok
  }

  /** Back to the rule order for today. */
  async function clearOrder(): Promise<boolean> {
    const ids = tasks.value.filter((t) => t.priority_date === today.value).map((t) => t.id)
    const results = await Promise.all(ids.map((id) => client.from('tasks').update({ priority: null, priority_date: null, start_time: null }).eq('id', id).select('id')))
    const ok = results.every((r) => !r.error && (r.data?.length ?? 0) > 0)
    if (ok) await load()
    return ok
  }

  /** A short note she will see under the task. */
  async function setNote(taskId: string, text: string): Promise<boolean> {
    const note = text.trim()
    const { data, error } = await client.from('tasks').update({ note: note === '' ? null : note.slice(0, 200) }).eq('id', taskId).select('id')
    const ok = !error && (data?.length ?? 0) > 0
    if (ok) await load()
    return ok
  }

  /** Marks a task she added as looked at. */
  async function markSeen(taskId: string): Promise<boolean> {
    const { data, error } = await client.from('tasks').update({ seen_by_parent: true }).eq('id', taskId).select('id')
    const ok = !error && (data?.length ?? 0) > 0
    if (ok) await load()
    return ok
  }

  async function remove(taskId: string): Promise<boolean> {
    const { data, error } = await client.from('tasks').delete().eq('id', taskId).select('id')
    const ok = !error && (data?.length ?? 0) > 0
    if (ok) await load()
    return ok
  }

  watch(
    childId,
    () => {
      loaded.value = false
      return load()
    },
    { immediate: true },
  )

  return { tasks, ordered, day, allDone, dayDoneAt, dayDoneSeen, dayStar, giveDayStar, markDaySeen, uncomplete, context, screenTimeDay, loaded, failed, load, complete, add, setScreenTimeDay, saveOrder, clearOrder, setNote, markSeen, remove }
}
