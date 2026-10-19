/** Short, kind messages for what the database and Supabase Auth say. Nothing is blamed on the child. */

function messageOf(error: unknown): string {
  if (typeof error === 'string') return error
  if (typeof error === 'object' && error !== null && 'message' in error) return String((error as { message: unknown }).message)
  return ''
}

export const PIN_MESSAGES = {
  wrong: 'That PIN is not right. Try again.',
  locked: 'Too many wrong tries. Please wait 15 minutes.',
  format: 'The PIN must be 4 to 6 numbers.',
  currentWrong: 'The current PIN is not right.',
  freshSignIn: 'For safety, sign out and sign in with your password. Then reset the PIN within 10 minutes.',
  notSignedIn: 'Please sign in first.',
  generic: 'Something went wrong. Please try again.',
} as const

/** Maps a database error from a PIN function to a short message. */
export function pinErrorMessage(error: unknown): string {
  const text = messageOf(error).toLowerCase()
  if (text.includes('too many wrong')) return PIN_MESSAGES.locked
  if (text.includes('4 to 6 digits')) return PIN_MESSAGES.format
  if (text.includes('current pin is wrong')) return PIN_MESSAGES.currentWrong
  if (text.includes('sign out and sign in again')) return PIN_MESSAGES.freshSignIn
  if (text.includes('not signed in')) return PIN_MESSAGES.notSignedIn
  if (text.includes('no pin set')) return 'Set a PIN first.'
  return PIN_MESSAGES.generic
}

/** Maps a Supabase Auth error to a short message. */
export function authErrorMessage(error: unknown): string {
  const text = messageOf(error).toLowerCase()
  if (text.includes('invalid login')) return 'That email or password is not right.'
  if (text.includes('already registered') || text.includes('already been registered')) {
    return 'That email already has an account. Try signing in.'
  }
  if (text.includes('email not confirmed')) return 'Please open the email we sent and confirm it first.'
  if (text.includes('at least') && text.includes('character')) return 'Please use a longer password (at least 6 characters).'
  if (text.includes('valid email') || text.includes('invalid format')) return 'Please check the email address.'
  if (text.includes('rate limit') || text.includes('too many') || text.includes('only request this after')) {
    return 'Please wait a minute and try again.'
  }
  if (text.includes('fetch') || text.includes('network')) return 'No internet right now. Check your connection and try again.'
  return 'Something went wrong. Please try again.'
}
