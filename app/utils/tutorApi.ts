import { isNegative, subtract, type MixedNumber, type Problem } from './fraction'

/** What the Tutor routes send back. Failures always carry a short, kind message. */
export type Failure = { ok: false; reason: string; message: string }

export type ReadReply =
  | { ok: true; problem: Problem; operands: [string, string]; problemText: string; confidence: 'high' | 'low' }
  | Failure

export type HintReply = { ok: true; hint: string; source: string; level: number } | Failure

export type ExplainReply =
  | { ok: true; verdict: 'clear' | 'partly' | 'missing'; praise: string; followUp?: string; source: string }
  | Failure

export type ReadBody = { imageBase64: string; mediaType: 'image/jpeg' } | { text: string }
export interface HintBody {
  problem: Problem
  studentAnswer?: string
  stuck: boolean
  level: 1 | 2 | 3
}
export interface ExplainBody {
  problem: Problem
  explanation: string
}

export interface TutorApi {
  read(body: ReadBody): Promise<ReadReply>
  hint(body: HintBody): Promise<HintReply>
  explain(body: ExplainBody): Promise<ExplainReply>
}

export const OFFLINE_MESSAGE = 'No internet right now. Check your connection and try again.'
export const TROUBLE_MESSAGE = 'The tutor is taking a short break. Try again in a moment.'

/** Anything like $fetch: posts JSON and resolves with the parsed body, or throws. */
export type Poster = (url: string, body: unknown) => Promise<unknown>

function failure(reason: string, message: string): Failure {
  return { ok: false, reason, message }
}

/** A reply from a failed request (like a 429 or a 413) still has our kind message in its body. */
function bodyOf(error: unknown): Failure | null {
  const data = typeof error === 'object' && error !== null && 'data' in error ? (error as { data: unknown }).data : null
  if (typeof data === 'object' && data !== null && 'message' in data && (data as { ok?: unknown }).ok === false) {
    const { reason, message } = data as { reason?: unknown; message: unknown }
    return failure(typeof reason === 'string' ? reason : 'error', String(message))
  }
  return null
}

function isOffline(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  // A failed network request has no response from the server.
  return typeof error === 'object' && error !== null && !('response' in error && (error as { response: unknown }).response)
}

async function send<T extends { ok: boolean }>(post: Poster, url: string, body: unknown): Promise<T | Failure> {
  try {
    return (await post(url, body)) as T
  } catch (error) {
    return bodyOf(error) ?? (isOffline(error) ? failure('offline', OFFLINE_MESSAGE) : failure('unavailable', TROUBLE_MESSAGE))
  }
}

/** The Tutor routes, with failures turned into friendly messages instead of thrown errors. */
export function createTutorApi(post: Poster): TutorApi {
  return {
    read: (body) => send<ReadReply>(post, '/api/tutor/read', body) as Promise<ReadReply>,
    hint: (body) => send<HintReply>(post, '/api/tutor/hint', body) as Promise<HintReply>,
    explain: (body) => send<ExplainReply>(post, '/api/tutor/explain', body) as Promise<ExplainReply>,
  }
}

/** Typed problems skip the AI. This checks they make sense, in words a child can follow. */
export function problemError(problem: Problem): string | null {
  const parts = [problem.a, problem.b] as MixedNumber[]
  for (const p of parts) {
    if (!Number.isInteger(p.whole) || !Number.isInteger(p.num) || !Number.isInteger(p.den) || p.den < 1) {
      return 'Check the numbers. The bottom number can not be zero.'
    }
  }
  if (problem.op === 'subtract' && isNegative(subtract(problem.a, problem.b))) {
    return 'Put the bigger number first when you subtract.'
  }
  return null
}

