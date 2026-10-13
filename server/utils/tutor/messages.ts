/** Kid-friendly messages for when something can't be done. Short, kind, and never blaming. */
export const FAILURE_MESSAGES = {
  unsupported: 'I can only help with adding and subtracting fractions right now. Try another problem!',
  too_large: 'That picture is too big. Try a smaller photo.',
  unreadable: 'I could not read that one. Can you type the problem instead?',
  unavailable: 'The tutor is taking a short break. Try again in a moment.',
  rate_limited: 'Wow, lots of questions! Take a little break and try again soon.',
  bad_request: 'Something looked odd in that request. Please try again.',
} as const

export type FailureReason = keyof typeof FAILURE_MESSAGES

export function failure(reason: FailureReason) {
  return { ok: false as const, reason, message: FAILURE_MESSAGES[reason] }
}
