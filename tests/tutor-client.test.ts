import { beforeEach, describe, expect, it, vi } from 'vitest'

const constructed: Array<{ apiKey?: string }> = []

// The real SDK is replaced, so no network and no key are ever used.
vi.mock('@anthropic-ai/sdk', () => ({
  default: class FakeAnthropic {
    constructor(options: { apiKey?: string }) {
      constructed.push(options)
    }
  },
}))

describe('server/utils/anthropic', () => {
  beforeEach(() => {
    constructed.length = 0
    vi.resetModules()
  })

  it('builds the client from the key', async () => {
    const { createAnthropic } = await import('../server/utils/anthropic')
    createAnthropic('sk-test')
    expect(constructed).toEqual([{ apiKey: 'sk-test' }])
  })

  it('refuses to build a client with no key', async () => {
    const { createAnthropic } = await import('../server/utils/anthropic')
    expect(() => createAnthropic('')).toThrow(/NUXT_ANTHROPIC_API_KEY/)
  })

  it('getAnthropic returns null without a key and reuses one client per key', async () => {
    const { getAnthropic } = await import('../server/utils/anthropic')
    expect(getAnthropic('')).toBeNull()
    const first = getAnthropic('sk-a')
    expect(getAnthropic('sk-a')).toBe(first)
    expect(getAnthropic('sk-b')).not.toBe(first)
    expect(constructed).toHaveLength(2)
  })

  it('uses the models you asked for', async () => {
    const { READ_MODEL, HINT_MODEL, EXPLAIN_MODEL } = await import('../server/utils/anthropic')
    expect(READ_MODEL).toBe('claude-sonnet-5-5')
    expect(HINT_MODEL).toBe('claude-haiku-4-5-20251001')
    expect(EXPLAIN_MODEL).toBe('claude-haiku-4-5-20251001')
  })
})
