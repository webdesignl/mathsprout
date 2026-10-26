/** Feedback from demo visitors: a star rating, an optional "who are you", an optional note and an optional problem report. */
export const MAX_FEEDBACK_MESSAGE = 1000
export const MAX_FEEDBACK_ISSUE = 1000

export const FEEDBACK_SEVERITY = [
  { value: 'low', label: 'Small: looks odd, still works' },
  { value: 'medium', label: 'Medium: something does not work' },
  { value: 'high', label: 'Big: I am stuck or it broke' },
] as const

export type FeedbackSeverity = (typeof FEEDBACK_SEVERITY)[number]['value']

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
  issue?: string
  severity?: FeedbackSeverity | ''
}

export interface FeedbackRow {
  rating: number
  who: FeedbackWho | null
  message: string | null
  issue: string | null
  severity: FeedbackSeverity | null
}

/** The row to save, or the sentence to show when the form is not ready. Mirrors the checks in the database. */
export function feedbackRow(input: FeedbackInput): { row: FeedbackRow } | { error: string } {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return { error: 'Please choose 1 to 5 stars.' }
  const message = input.message.trim()
  if (message.length > MAX_FEEDBACK_MESSAGE) return { error: `Please keep your note under ${MAX_FEEDBACK_MESSAGE} characters.` }
  const issue = (input.issue ?? '').trim()
  if (issue.length > MAX_FEEDBACK_ISSUE) return { error: `Please keep the problem description under ${MAX_FEEDBACK_ISSUE} characters.` }
  // A severity without a problem is dropped; a problem without a severity is a medium one.
  const severity = issue === '' ? null : input.severity || 'medium'
  return {
    row: {
      rating: input.rating,
      who: input.who === '' ? null : input.who,
      message: message === '' ? null : message,
      issue: issue === '' ? null : issue,
      severity,
    },
  }
}

export const RATING_WORDS = ['', 'Not good', 'Could be better', 'Okay', 'Good', 'Great'] as const
