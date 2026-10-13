import type { Problem } from '../../../app/utils/fraction'

/** True when DEMO_MODE is on: the tutor routes answer with canned responses and make no API calls. */
export function isDemoMode(env: Record<string, string | undefined> = process.env): boolean {
  const value = env.DEMO_MODE?.trim().toLowerCase()
  return value === 'true' || value === '1' || value === 'yes'
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
