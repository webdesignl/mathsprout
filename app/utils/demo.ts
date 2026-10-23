/** The public demo: a private sandbox family for each visitor, deleted after 24 hours. */
export const DEMO_PIN = '1234'
export const DEMO_HOURS = 24

/** The one line the banner shows on every page for a demo visitor. */
export const DEMO_NOTICE = `Demo · Your changes are deleted after ${DEMO_HOURS} hours · Please don’t type real names`

/** True when the signed-in claims belong to an anonymous (demo) visitor. */
export function isDemoUser(user: { is_anonymous?: unknown } | null | undefined): boolean {
  return user?.is_anonymous === true
}
