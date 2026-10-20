import type { Database } from '../types/database.types'
import { missingDefaults, type NewTemplate, type TaskTemplate } from '../utils/taskTemplates'

/** A child's usual tasks. Anyone in the family can read them; only parent mode can change them (RLS). */
export function useTaskTemplates(childId: Ref<string | null>) {
  const client = useSupabaseClient<Database>()
  const templates = ref<TaskTemplate[]>([])
  const loaded = ref(false)
  const failed = ref(false)

  async function load() {
    loaded.value = false
    failed.value = false
    templates.value = []
    if (!childId.value) return
    const { data, error } = await client
      .from('task_templates')
      .select('id, kind, title, minutes, ask_detail, category, repeat_daily, sort_order')
      .eq('child_id', childId.value)
      .order('sort_order')
      .order('created_at')
    if (error || !data) {
      failed.value = true
      return
    }
    templates.value = data as TaskTemplate[]
    loaded.value = true
  }

  async function familyId(): Promise<string | null> {
    const { data } = await client.rpc('my_family_id')
    return typeof data === 'string' ? data : null
  }

  async function add(item: NewTemplate): Promise<boolean> {
    const family = await familyId()
    if (!childId.value || !family) return false
    const sort_order = templates.value.reduce((max, t) => Math.max(max, t.sort_order), 0) + 1
    const { error } = await client.from('task_templates').insert({ ...item, family_id: family, child_id: childId.value, sort_order })
    if (!error) await load()
    return !error
  }

  /** Adds the usual set, skipping any the family already has. */
  async function addUsualSet(): Promise<boolean> {
    const family = await familyId()
    if (!childId.value || !family) return false
    const base = templates.value.reduce((max, t) => Math.max(max, t.sort_order), 0)
    const rows = missingDefaults(templates.value).map((d, i) => ({ ...d, family_id: family, child_id: childId.value!, sort_order: base + i + 1 }))
    if (rows.length === 0) return true
    const { error } = await client.from('task_templates').insert(rows)
    if (!error) await load()
    return !error
  }

  async function remove(id: string): Promise<boolean> {
    const { data, error } = await client.from('task_templates').delete().eq('id', id).select('id')
    const ok = !error && (data?.length ?? 0) > 0
    if (ok) await load()
    return ok
  }

  watch(childId, load, { immediate: true })

  return { templates, loaded, failed, load, add, addUsualSet, remove }
}
