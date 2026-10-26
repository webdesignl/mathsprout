import { describe, expect, it } from 'vitest'
import { expiresLabel, INVITE_MESSAGES, inviteErrorMessage, inviteLink, tokenFromHash } from '../app/utils/invite'

const TOKEN = 'a'.repeat(48)

describe('invite link', () => {
  it('puts the token after the # so servers never see it', () => {
    expect(inviteLink('https://example.test', TOKEN)).toBe(`https://example.test/join#${TOKEN}`)
  })
  it('reads a token back from the hash, with or without the #', () => {
    expect(tokenFromHash(`#${TOKEN}`)).toBe(TOKEN)
    expect(tokenFromHash(TOKEN)).toBe(TOKEN)
  })
  it('rejects anything not shaped like a token', () => {
    for (const bad of ['', '#', '#abc', `#${'g'.repeat(48)}`, `#${TOKEN}0`, `#${'A'.repeat(48)}`, '#<script>']) {
      expect(tokenFromHash(bad)).toBeNull()
    }
  })
})

describe('inviteErrorMessage', () => {
  it('maps the database sentences to kind ones', () => {
    expect(inviteErrorMessage({ message: 'Parent mode is off' })).toBe(INVITE_MESSAGES.parentMode)
    expect(inviteErrorMessage({ message: 'Too many open invites' })).toBe(INVITE_MESSAGES.tooMany)
    expect(inviteErrorMessage({ message: 'Invites are not available in the demo' })).toBe(INVITE_MESSAGES.demo)
    expect(inviteErrorMessage({ message: 'Invite link is not valid or has expired' })).toBe(INVITE_MESSAGES.expired)
    expect(inviteErrorMessage({ message: 'Database error saving new user' })).toBe(INVITE_MESSAGES.expired)
    expect(inviteErrorMessage(new Error('boom'))).toBe(INVITE_MESSAGES.generic)
    expect(inviteErrorMessage(null)).toBe(INVITE_MESSAGES.generic)
  })
})

describe('expiresLabel', () => {
  const now = Date.parse('2026-10-24T12:00:00Z')
  const at = (ms: number) => new Date(now + ms).toISOString()
  it('counts down in days, hours and minutes', () => {
    expect(expiresLabel(at(3 * 86_400_000), now)).toBe('Expires in 3 days')
    expect(expiresLabel(at(86_400_000), now)).toBe('Expires in 1 day')
    expect(expiresLabel(at(5 * 3_600_000), now)).toBe('Expires in 5 hours')
    expect(expiresLabel(at(20 * 60_000), now)).toBe('Expires in 20 minutes')
    expect(expiresLabel(at(30_000), now)).toBe('Expires in 1 minute')
  })
  it('says Expired once the time has passed or the date is bad', () => {
    expect(expiresLabel(at(-1000), now)).toBe('Expired')
    expect(expiresLabel('not a date', now)).toBe('Expired')
  })
})
