import { CHALLENGES } from '../data/deepCheck'
import { buildBarStages } from './fractionBar'
import type { Plan } from './plan'

/**
 * Which Deep Check rule a Tutor plan teaches, found by code from the shape of the plan:
 * same amount each day (R21), work backwards from what is left (R20), a fraction of the rest (R19).
 * Null for any other problem.
 */
export function modelRuleId(plan: Plan | null | undefined): 'R19' | 'R20' | 'R21' | null {
  if (!plan) return null
  if (plan.rate) return 'R21'
  if (plan.unit) return 'R20'
  return buildBarStages(plan) ? 'R19' : null
}

/** The first Olympiad challenge that uses a rule, if there is one. */
export function challengeForRule(ruleId: string): string | null {
  return CHALLENGES.find((c) => c.ruleIds.includes(ruleId))?.id ?? null
}

/** Links into Deep Check. The page reads `rule`, `mode` and `challenge` and opens that screen. */
export function deepCheckLink(kind: 'learn' | 'quiz' | 'challenge', id: string): string {
  return kind === 'challenge' ? `/deep-check?challenge=${encodeURIComponent(id)}` : `/deep-check?rule=${encodeURIComponent(id)}&mode=${kind}`
}
