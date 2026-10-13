import type { H3Event } from 'h3'
import { getAnthropic } from '../anthropic'
import { isDemoMode } from './demo'
import type { TutorDeps, TutorResponse } from './handlers'
import { tutorLimiter } from './rateLimit'

/** Builds the dependencies for a request. The API key comes from server-only runtime config. */
export function tutorDeps(event: H3Event): TutorDeps {
  const config = useRuntimeConfig(event)
  return {
    client: getAnthropic(String(config.anthropicApiKey ?? '')),
    demo: isDemoMode(),
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
