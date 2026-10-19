import { createParentMode, type RpcClient } from '../utils/parentMode'
import type { Database } from '../types/database.types'

/** Parent mode for the signed-in family. The state is shared by every page, and the database does the checking. */
export function useParentMode() {
  const client = useSupabaseClient<Database>()
  const hasPin = useState<boolean | null>('parent-has-pin', () => null)
  const expiresAt = useState<number | null>('parent-expires-at', () => null)
  const now = useState<number>('parent-now', () => Date.now())
  return createParentMode(client as unknown as RpcClient, { hasPin, expiresAt, now })
}
