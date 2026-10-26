import { inviteErrorMessage, inviteLink } from '../utils/invite'

export interface OpenInvite {
  id: string
  created_at: string
  expires_at: string
}

/** Invites for a second parent. The database checks parent mode, the 5-invite limit and expiry; this only calls it. */
export function useInvites() {
  const client = useSupabaseClient()
  const invites = ref<OpenInvite[]>([])
  const busy = ref(false)
  const error = ref('')

  /** Open (unused, not expired) invites. Empty when parent mode is off, because the database returns nothing. */
  async function load() {
    const { data } = await client
      .from('family_invites' as never)
      .select('id, created_at, expires_at')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    invites.value = (data as unknown as OpenInvite[] | null) ?? []
  }

  /** Makes an invite and returns its link. The link is shown once; only a hash is kept. */
  async function create(): Promise<string | null> {
    if (busy.value) return null
    busy.value = true
    error.value = ''
    const { data, error: failure } = await client.rpc('create_family_invite' as never)
    busy.value = false
    const token = (data as unknown as { token?: string } | null)?.token
    if (failure || !token) {
      error.value = inviteErrorMessage(failure)
      return null
    }
    await load()
    return inviteLink(window.location.origin, token)
  }

  async function revoke(id: string): Promise<void> {
    error.value = ''
    const { error: failure } = await client.from('family_invites' as never).delete().eq('id', id)
    if (failure) error.value = inviteErrorMessage(failure)
    await load()
  }

  /** True when a link is still good. The join page asks this before showing the sign-up form. */
  async function isValid(token: string): Promise<boolean> {
    const { data } = await client.rpc('invite_is_valid' as never, { p_token: token } as never)
    return data === true
  }

  return { invites, busy, error, load, create, revoke, isValid }
}
