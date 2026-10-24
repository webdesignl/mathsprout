/** Feedback from demo visitors: a star rating, an optional "who are you" and an optional note. */
export const MAX_FEEDBACK_MESSAGE = 1000

export const FEEDBACK_WHO = [
  { value: 'recruiter', label: 'A recruiter or employer' },
  { value: 'teacher', label: 'A teacher' },
  { value: 'parent', label: 'A parent' },
  { value: 'developer', label: 'A developer' },
  { value: 'other', label: 'Someone else' },
] as const

export type FeedbackWho = (typeof FEEDBACK_WHO)[number]['value']

export interface FeedbackInput {
  rating: number
  who: FeedbackWho | ''
  message: string
}

/** The row to save, or the sentence to show when the form is not ready. Mirrors the checks in the database. */
export function feedbackRow(input: FeedbackInput): { row: { rating: number; who: FeedbackWho | null; message: string | null } } | { error: string } {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return { error: 'Please choose 1 to 5 stars.' }
  const message = input.message.trim()
  if (message.length > MAX_FEEDBACK_MESSAGE) return { error: `Please keep your note under ${MAX_FEEDBACK_MESSAGE} characters.` }
  return { row: { rating: input.rating, who: input.who === '' ? null : input.who, message: message === '' ? null : message } }
}

export const RATING_WORDS = ['', 'Not good', 'Could be better', 'Okay', 'Good', 'Great'] as const
