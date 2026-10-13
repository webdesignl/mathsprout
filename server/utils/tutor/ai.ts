import type Anthropic from '@anthropic-ai/sdk'
import type { MessagesClient } from '../anthropic'

export class DeadlineError extends Error {
  constructor() {
    super('The AI call took too long.')
    this.name = 'DeadlineError'
  }
}

/**
 * Calls the model but gives up after `timeoutMs`, even if the SDK or a test double ignores the abort signal.
 * Retries are off by default so the total time stays inside the deadline.
 */
export async function createWithDeadline(
  client: MessagesClient,
  params: Anthropic.MessageCreateParamsNonStreaming,
  options: { timeoutMs: number; maxRetries?: number },
): Promise<Anthropic.Message> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs)
  try {
    return await Promise.race([
      client.messages.create(params, {
        signal: controller.signal,
        timeout: options.timeoutMs,
        maxRetries: options.maxRetries ?? 0,
      }),
      new Promise<never>((_resolve, reject) => {
        controller.signal.addEventListener('abort', () => reject(new DeadlineError()))
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/** Pulls a JSON object out of a model reply, even if it was wrapped in a code fence or had extra words. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start === -1 || end <= start) return undefined
    try {
      return JSON.parse(trimmed.slice(start, end + 1))
    } catch {
      return undefined
    }
  }
}

/** JSON for a prompt's <data> block. "<" is escaped so student text can't close the block early. */
export function dataBlock(data: unknown): string {
  return `<data>\n${JSON.stringify(data).replace(/</g, '\\u003c')}\n</data>`
}
