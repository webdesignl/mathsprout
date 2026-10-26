/** Inviting a second parent: the link, the token in it, and the sentences the Parent page and join page show. */
export const INVITE_DAYS = 3
const TOKEN = /^[0-9a-f]{48}$/

/** The link to send. The token goes after the # so it is never sent to a server or written to a log. */
export function inviteLink(origin: string, token: string): string {
  return `${origin}/join#${token}`
}

/** The token from the address bar's hash (with or without the #), or null when it is not shaped like one. */
export function tokenFromHash(hash: string): string | null {
  const value = hash.replace(/^#/, '').trim()
  return TOKEN.test(value) ? value : null
}

export const INVITE_MESSAGES = {
  parentMode: 'Turn on parent mode first (enter your PIN), then try again.',
  tooMany: 'You already have 5 open invites. Remove one first.',
  demo: 'Invites are not available in the demo.',
  expired: 'This invite link has expired or was already used. Ask for a new one.',
  generic: 'Something went wrong. Please try again.',
} as const

/** Maps a database error from an invite function to a short message. */
export function inviteErrorMessage(error: unknown): string {
  const text = (typeof error === 'object' && error !== null && 'message' in error ? String((error as { message: unknown }).message) : String(error ?? '')).toLowerCase()
  if (text.includes('parent mode is off')) return INVITE_MESSAGES.parentMode
  if (text.includes('too many open invites')) return INVITE_MESSAGES.tooMany
  if (text.includes('not available in the demo')) return INVITE_MESSAGES.demo
  if (text.includes('not valid or has expired') || text.includes('database error')) return INVITE_MESSAGES.expired
  return INVITE_MESSAGES.generic
}

/** "Expires in 2 days", "Expires in 5 hours", "Expires in 20 minutes", or "Expired". */
export function expiresLabel(expiresAt: string, now: number = Date.now()): string {
  const ms = new Date(expiresAt).getTime() - now
  if (!(ms > 0)) return 'Expired'
  const minutes = Math.ceil(ms / 60_000)
  if (minutes < 60) return `Expires in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  const hours = Math.round(ms / 3_600_000)
  if (hours < 24) return `Expires in ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  const days = Math.round(ms / 86_400_000)
  return `Expires in ${days} ${days === 1 ? 'day' : 'days'}`
}
