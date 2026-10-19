import type { Child } from '../stores/child'

/**
 * Loads the family's children. Asks for the animal too; if the database does not have that column yet
 * (the avatar migration has not been run), it asks again without it so names never disappear.
 */
export function useChildren() {
  const client = useSupabaseClient()
  async function fetchChildren(): Promise<Child[] | null> {
    const withAvatar = await client.from('children').select('id, nickname, grade, avatar').order('created_at')
    if (!withAvatar.error) return withAvatar.data
    const plain = await client.from('children').select('id, nickname, grade').order('created_at')
    return plain.error ? null : plain.data.map((c) => ({ ...c, avatar: null }))
  }
  return { fetchChildren }
}
