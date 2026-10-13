/**
 * Removes things that look like personal details before text goes to an AI: emails, phone numbers,
 * and names that are introduced ("my name is Mia", "Hi Sam", "Name: Lee").
 * It cannot catch every name, so the prompts also tell the model to ignore personal details.
 */

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g
// International numbers (+44 20 7946 0958) and 10-digit numbers (555-123-4567, (555) 123 4567).
const PHONE_INTL = /\+\d[\d\s().-]{7,}\d/g
const PHONE_LOCAL = /(?<![\d/])(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?![\d/])/g
const NAME_INTRO =
  /\b((?:[Mm]y name is|[Mm]y name's|I am|I'm|[Cc]all me|[Hh]i|[Hh]ello|[Hh]ey|[Dd]ear|Name:|Student:)\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g

export const REMOVED = '[removed]'

export function stripPersonalDetails(text: string): string {
  return text
    .replace(EMAIL, REMOVED)
    .replace(PHONE_INTL, REMOVED)
    .replace(PHONE_LOCAL, REMOVED)
    .replace(NAME_INTRO, `$1${REMOVED}`)
}
