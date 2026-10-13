import Anthropic from '@anthropic-ai/sdk'

/** Reads photos and word problems. */
export const READ_MODEL = 'claude-sonnet-5-5'
/** Writes hints and gives feedback on explanations. */
export const HINT_MODEL = 'claude-haiku-4-5-20251001'
export const EXPLAIN_MODEL = HINT_MODEL

/** The one SDK call the tutor uses, so tests can pass a small fake instead of the real client. */
export interface MessagesClient {
  messages: {
    create(
      params: Anthropic.MessageCreateParamsNonStreaming,
      options?: { timeout?: number; maxRetries?: number; signal?: AbortSignal },
    ): Promise<Anthropic.Message>
  }
}

/** Builds the API client. The key comes from server-only runtime config, never from the browser. */
export function createAnthropic(apiKey: string): Anthropic {
  if (!apiKey) throw new Error('The Anthropic API key is not set (NUXT_ANTHROPIC_API_KEY).')
  return new Anthropic({ apiKey })
}

const clients = new Map<string, Anthropic>()

/** One client per key, created on first use. Returns null when no key is set, so the tutor can fall back. */
export function getAnthropic(apiKey: string): Anthropic | null {
  if (!apiKey) return null
  let client = clients.get(apiKey)
  if (!client) {
    client = createAnthropic(apiKey)
    clients.set(apiKey, client)
  }
  return client
}

/** The text of a reply, joined. Empty for refusals or replies with no text. */
export function replyText(message: Anthropic.Message): string {
  if (message.stop_reason === 'refusal') return ''
  return message.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join(' ')
    .trim()
}

/**
 * Logs that a call failed, without ever logging the request: no images, no student text.
 * Only the kind of failure and the HTTP status are recorded.
 */
export function logTutorError(route: string, error: unknown): void {
  const status = typeof error === 'object' && error !== null && 'status' in error ? String(error.status) : ''
  const name = error instanceof Error ? error.name : 'Error'
  console.error(`[tutor:${route}] ${name}${status ? ` ${status}` : ''}`)
}
