import type { Database } from '../types/database.types'
import { useChildStore } from '../stores/child'
import { useSyncStore } from '../stores/sync'

/** Connects the sync store to Supabase with the publishable key and the signed-in user's own session (RLS applies). */
export default defineNuxtPlugin(() => {
  const client = useSupabaseClient<Database>()
  const sync = useSyncStore()
  const child = useChildStore()
  const user = useSupabaseUser()

  let cached: string | null = null
  let cachedFor: string | null = null
  sync.configure({
    childId: () => child.selectedId,
    familyId: async () => {
      // The family belongs to the signed-in account, so a different account looks it up again.
      const who = user.value?.id ?? null
      if (cached && cachedFor === who) return cached
      const { data, error } = await client.rpc('my_family_id')
      cached = error || typeof data !== 'string' ? null : data
      cachedFor = who
      return cached
    },
    save: async (row) => {
      const { error } = await client.from('attempts').insert(row)
      return !error
    },
    saveAward: async (row) => {
      const { error } = await client.from('awards').insert(row)
      return !error
    },
    saveIdea: async (row) => {
      const { error } = await client.from('ideas').insert(row)
      return !error
    },
  })
})
