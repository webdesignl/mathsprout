import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { getAnthropic } from '../anthropic'
import { useDemoAnswers } from './demo'
import type { TutorDeps, TutorResponse } from './handlers'
import { tutorLimiter } from './rateLimit'

/**
 * Builds the dependencies for a request. The API key comes from server-only runtime config.
 * Only a real, signed-in family account gets the AI client; signed-out visitors, demo (anonymous) users,
 * DEMO_MODE and any error reading the user get canned answers and no client at all.
 */
export async function tutorDeps(event: H3Event): Promise<TutorDeps> {
  const demo = await useDemoAnswers({ readClaims: () => serverSupabaseUser(event) })
  const config = useRuntimeConfig(event)
  return {
    client: demo ? null : getAnthropic(String(config.anthropicApiKey ?? '')),
    demo,
    limiter: tutorLimiter,
    ip: getRequestIP(event, { xForwardedFor: true }) ?? 'unknown',
  }
}

/** Sends a handler's result: status, headers and JSON body. */
export function respond(event: H3Event, result: TutorResponse): unknown {
  setResponseStatus(event, result.status)
  for (const [name, value] of Object.entries(result.headers ?? {})) setResponseHeader(event, name, value)
  return result.body
}
