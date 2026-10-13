import { vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import type { MessagesClient } from '../server/utils/anthropic'
import type { Problem } from '../app/utils/fraction'

/** 8 1/5 - 4 3/4 = 3 9/20 (steps: rename, regroup, subtractWholes, subtractNumerators 24/20 - 15/20 = 9/20, answer). */
export const SUB: Problem = { op: 'subtract', a: { whole: 8, num: 1, den: 5 }, b: { whole: 4, num: 3, den: 4 } }
/** 4 1/3 + 2 5/12 = 6 3/4 */
export const ADD: Problem = { op: 'add', a: { whole: 4, num: 1, den: 3 }, b: { whole: 2, num: 5, den: 12 } }

type Reply = string | Error | (() => Promise<unknown>) | { text: string; stop_reason: string }

function message(text: string, stop_reason = 'end_turn'): Anthropic.Message {
  return { content: [{ type: 'text', text }], stop_reason } as unknown as Anthropic.Message
}

/**
 * A stand-in for the Anthropic SDK. Each call returns the next reply: text, an Error to throw,
 * or a function (for slow replies). It records every request so tests can inspect what was sent.
 */
export function fakeClient(...replies: Reply[]) {
  const calls: Anthropic.MessageCreateParamsNonStreaming[] = []
  let i = 0
  const create = vi.fn(async (params: Anthropic.MessageCreateParamsNonStreaming) => {
    calls.push(params)
    const reply = replies[Math.min(i++, replies.length - 1)]
    if (reply instanceof Error) throw reply
    if (typeof reply === 'function') return (await reply()) as Anthropic.Message
    if (typeof reply === 'object' && reply !== null) return message(reply.text, reply.stop_reason)
    return message(reply ?? '')
  })
  const client: MessagesClient = { messages: { create } as unknown as MessagesClient['messages'] }
  return { client, calls, create }
}

/** The text of the first user message in a recorded request, for checking what was sent. */
export function sentText(call: Anthropic.MessageCreateParamsNonStreaming): string {
  const first = call.messages[0]!
  if (typeof first.content === 'string') return first.content
  return first.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n')
}
