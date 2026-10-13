import type { MessagesClient } from '../anthropic'
import { DEMO_PRAISE, DEMO_PROBLEM, DEMO_PROBLEM_TEXT } from './demo'
import { evaluateExplanation } from './explain'
import { buildHintContext, generateHint } from './hint'
import { failure, type FailureReason } from './messages'
import type { RateLimiter } from './rateLimit'
import { readProblem } from './read'
import { explainInputSchema, hintInputSchema, readInputSchema, understandInputSchema } from './schemas'
import { generateUnderstanding } from './understand'
import { understandTemplate } from '../../../app/utils/tutorHints'
import { templateHint } from './templates'

/** What the three routes need. Tests pass fakes for all of it. */
export interface TutorDeps {
  /** Null when no API key is set. The tutor then falls back to templates. */
  client: MessagesClient | null
  demo: boolean
  limiter: RateLimiter
  ip: string
}

export interface TutorResponse {
  status: number
  body: unknown
  headers?: Record<string, string>
}

const STATUS: Partial<Record<FailureReason, number>> = {
  too_large: 413,
  unavailable: 503,
  rate_limited: 429,
  bad_request: 400,
}

function fail(reason: FailureReason, headers?: Record<string, string>): TutorResponse {
  return { status: STATUS[reason] ?? 200, body: failure(reason), headers }
}

/** All three routes share one limit: 30 requests per 10 minutes per IP address. */
function limited(deps: TutorDeps): TutorResponse | null {
  const { allowed, retryAfterSec } = deps.limiter.check(deps.ip)
  return allowed ? null : fail('rate_limited', { 'Retry-After': String(retryAfterSec) })
}

export async function handleRead(body: unknown, deps: TutorDeps): Promise<TutorResponse> {
  const blocked = limited(deps)
  if (blocked) return blocked

  const input = readInputSchema.safeParse(body)
  if (!input.success) return fail('bad_request')

  if (deps.demo) {
    return {
      status: 200,
      body: {
        ok: true,
        problem: DEMO_PROBLEM,
        operands: ['8 1/5', '4 3/4'],
        problemText: DEMO_PROBLEM_TEXT,
        confidence: 'high',
      },
    }
  }
  if (!deps.client) return fail('unavailable')

  const result = await readProblem(deps.client, input.data)
  return { status: result.ok ? 200 : (STATUS[result.reason] ?? 200), body: result }
}

export async function handleHint(body: unknown, deps: TutorDeps): Promise<TutorResponse> {
  const blocked = limited(deps)
  if (blocked) return blocked

  const input = hintInputSchema.safeParse(body)
  if (!input.success) return fail('bad_request')

  if (deps.demo) {
    // Canned: the hand-written hint for this level, with no API call.
    const ctx = buildHintContext(input.data)
    const hint = templateHint(ctx.diagnosis, ctx.steps[ctx.flaggedIndex]?.kind ?? 'rename', input.data.level, ctx.problem.op)
    return { status: 200, body: { ok: true, hint, source: 'demo', level: input.data.level } }
  }

  const result = await generateHint(deps.client, input.data)
  return { status: 200, body: { ok: true, hint: result.hint, source: result.source, level: input.data.level } }
}

export async function handleExplain(body: unknown, deps: TutorDeps): Promise<TutorResponse> {
  const blocked = limited(deps)
  if (blocked) return blocked

  const input = explainInputSchema.safeParse(body)
  if (!input.success) return fail('bad_request')

  if (deps.demo) {
    return { status: 200, body: { ok: true, verdict: 'clear', praise: DEMO_PRAISE, source: 'demo' } }
  }

  const result = await evaluateExplanation(deps.client, input.data)
  return { status: 200, body: { ok: true, ...result } }
}

export async function handleUnderstand(body: unknown, deps: TutorDeps): Promise<TutorResponse> {
  const blocked = limited(deps)
  if (blocked) return blocked

  const input = understandInputSchema.safeParse(body)
  if (!input.success) return fail('bad_request')

  if (deps.demo) {
    // Canned: the plain explanation, with no API call.
    const text = understandTemplate(input.data.problem, input.data.problemText)
    return { status: 200, body: { ok: true, text, source: 'demo' } }
  }

  const result = await generateUnderstanding(deps.client, input.data)
  return { status: 200, body: { ok: true, text: result.text, source: result.source } }
}
