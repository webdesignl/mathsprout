import type { Problem } from '../../../app/utils/fraction'

/** True when DEMO_MODE is on: the tutor routes answer with canned responses and make no API calls. */
export function isDemoMode(env: Record<string, string | undefined> = process.env): boolean {
  const value = env.DEMO_MODE?.trim().toLowerCase()
  return value === 'true' || value === '1' || value === 'yes'
}

/** The parts of a verified Supabase token this check reads. */
export interface VerifiedClaims {
  sub?: unknown
  role?: unknown
  is_anonymous?: unknown
}

/**
 * True only for a signed-in, non-anonymous account. The claims must come from a token the server verified,
 * never from the request body. Anything unclear (no id, not `authenticated`, `is_anonymous` missing or true)
 * is not a real family account, so the answer is "no AI".
 */
export function isRealFamilyUser(claims: VerifiedClaims | null | undefined): boolean {
  return Boolean(claims) && typeof claims!.sub === 'string' && claims!.sub !== '' && claims!.role === 'authenticated' && claims!.is_anonymous === false
}

/**
 * Should this request get the canned demo answers (and make no AI call)? Yes when DEMO_MODE is on, when nobody
 * is signed in, when the visitor is a demo (anonymous) user, and whenever reading the user fails.
 * Only a real family account reaches Claude. DEMO_MODE is checked first, so the emergency switch never reads a token.
 */
export async function useDemoAnswers(options: {
  env?: Record<string, string | undefined>
  readClaims: () => Promise<VerifiedClaims | null | undefined>
}): Promise<boolean> {
  if (isDemoMode(options.env ?? process.env)) return true
  try {
    return !isRealFamilyUser(await options.readClaims())
  } catch {
    return true
  }
}

/** An original elephant word problem: 8 1/5 - 4 3/4. */
export const DEMO_PROBLEM: Problem = {
  op: 'subtract',
  a: { whole: 8, num: 1, den: 5 },
  b: { whole: 4, num: 3, den: 4 },
}

export const DEMO_PROBLEM_TEXT =
  'An elephant has 8 1/5 buckets of water. It drinks 4 3/4 buckets. How many buckets are left?'

export const DEMO_PRAISE = 'You matched the bottoms and checked your work.'
