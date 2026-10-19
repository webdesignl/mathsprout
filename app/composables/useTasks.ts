import type { Database } from '../types/database.types'

/** A child ticks a task done with the database function; editing tasks needs parent mode (RLS). */
export function useTasks() {
  const client = useSupabaseClient<Database>()
  async function complete(taskId: string): Promise<boolean> {
    const { error } = await client.rpc('complete_task', { task_id: taskId })
    return !error
  }
  return { complete }
}
