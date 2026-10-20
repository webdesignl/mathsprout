import type { Database } from '../types/database.types'
import {
  CARRY_DAYS,
  daysLeftInWeek,
  orderDay,
  orderToday,
  splitOpen,
  todayString,
  weekStartIso,
  type TaskCategory,
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
  /** A parent paused this child: no list, nothing ages. */
  const paused = ref(false)
  const today = ref(todayString())
  /** Shared with the header badge on the Parent link. */
  const unseenTasks = useState<number>('unseen-tasks', () => 0)
  const unseenCompletions = useState<number>('unseen-completions', () => 0)
  const backlogCount = useState<number>('backlog-count', () => 0)

  const context = computed<TodayContext>(() => ({
    today: today.value,
    screenTimeDay: screenTimeDay.value,
    mapDoneThisWeek: mapDoneThisWeek.value,
    daysLeftInWeek: daysLeftInWeek(),
  }))
  /** Open tasks split into today's list, the carried-over reminder, and the Backlog. */
  const parts = computed(() => splitOpen(tasks.value, today.value))
  const finishedToday = computed(() => tasks.value.filter((t) => t.done))
  /** For a parent's plan: today's list and carried tasks together, so any of them can be put in order. */
  const ordered = computed(() => orderToday([...parts.value.list, ...parts.value.carried], context.value))
  /** The whole day in one list: finished tasks stay in place, crossed out. */
  const day = computed(() => orderDay([...parts.value.list, ...finishedToday.value], context.value))
  /** Important tasks from the last few days, shown under "Did you forget yesterday's homework?" */
  const carried = computed(() => parts.value.carried)
  const backlog = computed(() => parts.value.backlog)
  /** Everything that is on her plate today is ticked. */
  const allDone = computed(
    () => finishedToday.value.length > 0 && parts.value.list.length === 0 && parts.value.carried.length === 0,
  )

  async function load() {
    failed.value = false
    today.value = todayString()
    const id = childId.value
    if (!id) return
    // First tidy up: finished tasks from earlier days become a short summary and go; expired tasks go; today's
    // daily routines are added. Neither blocks the list if it fails.
    await client.rpc('close_past_days', { today: today.value })
    await client.rpc('ensure_routines', { child_id: id, plan_date: today.value })
    const midnight = new Date()
    midnight.setHours(0, 0, 0, 0)
    const weekStartDate = todayString(new Date(weekStartIso()))
    const [open, doneToday, plan, summaries, child] = await Promise.all([
      client.from('tasks').select('*').eq('child_id', id).eq('done', false).order('created_at'),
      client.from('tasks').select('*').eq('child_id', id).eq('done', true).eq('archived', false).gte('done_at', midnight.toISOString()),
      client.from('daily_plans').select('screen_time_day, completed_at, completion_seen').eq('child_id', id).eq('plan_date', today.value).maybeSingle(),
      // MAP done earlier this week is kept in the day summaries.
      client.from('day_summaries').select('map_done').eq('child_id', id).gte('summary_date', weekStartDate).lt('summary_date', today.value),
      client.from('children').select('paused_at').eq('id', id).maybeSingle(),
    ])
    if (open.error || doneToday.error) {
      failed.value = true
      return
    }
    paused.value = Boolean(child.data?.paused_at)
    tasks.value = [...open.data, ...doneToday.data] as TodayTask[]
    screenTimeDay.value = plan.data?.screen_time_day ?? false
    dayDoneAt.value = plan.data?.completed_at ?? null
    dayDoneSeen.value = plan.data?.completion_seen ?? true
    mapDoneThisWeek.value = (summaries.data ?? []).reduce((sum, r) => sum + r.map_done, 0)
    loaded.value = true
    const oldest = new Date()
    oldest.setDate(oldest.getDate() - (CARRY_DAYS + 1))
    const waiting = await client.from('tasks').select('id', { count: 'exact', head: true }).eq('category', 'important').eq('done', false).lte('for_date', todayString(oldest))
    if (!waiting.error) backlogCount.value = waiting.count ?? 0
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
    const { error } = await client.rpc('complete_task', { task_id: taskId, on_date: today.value })
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

  /** "Clear finished": hides the finished tasks from her list. Unfinished ones stay and carry over to tomorrow. */
  async function clearFinished(): Promise<boolean> {
    if (!childId.value) return false
    const { error } = await client.rpc('archive_done_tasks', { child_id: childId.value })
    if (error) return false
    tasks.value = tasks.value.filter((t) => !t.done)
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
  async function add(kind: TaskKind, title: string, due: string | null, minutes?: number | null, category?: TaskCategory): Promise<boolean> {
    if (!childId.value) return false
    const { error } = await client.rpc('add_task', { child_id: childId.value, kind, title, due: due ?? undefined, minutes: minutes ?? undefined, category, for_date: today.value })
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

  /** Pause or resume a child. While paused there is no list, nothing ages, and routines do not repeat. */
  async function setPaused(value: boolean): Promise<boolean> {
    if (!childId.value) return false
    const { error } = await client.rpc('set_child_paused', { child_id: childId.value, paused: value })
    if (error) return false
    paused.value = value
    await load()
    return true
  }

  /** From the Backlog: put the task back on today's list. */
  async function reprioritise(taskId: string): Promise<boolean> {
    const { data, error } = await client.from('tasks').update({ for_date: today.value, seen_by_parent: true }).eq('id', taskId).select('id')
    const ok = !error && (data?.length ?? 0) > 0
    if (ok) await load()
    return ok
  }

  /** From the Backlog: it was done on paper. */
  async function doneOffline(taskId: string): Promise<boolean> {
    const { error } = await client.rpc('complete_task', { task_id: taskId, on_date: today.value })
    if (!error) await load()
    return !error
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

  return { tasks, ordered, day, carried, backlog, paused, setPaused, reprioritise, doneOffline, allDone, dayDoneAt, dayDoneSeen, dayStar, giveDayStar, markDaySeen, uncomplete, clearFinished, context, screenTimeDay, loaded, failed, load, complete, add, setScreenTimeDay, saveOrder, clearOrder, setNote, markSeen, remove }
}
