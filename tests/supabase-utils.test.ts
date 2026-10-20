import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { appendDigit, canSubmitPin, maskPin, removeLastDigit } from '../app/utils/pin'
import { authErrorMessage, PIN_MESSAGES, pinErrorMessage } from '../app/utils/friendlyErrors'
import { attemptRow, problemToText } from '../app/utils/attempts'
import { createParentMode, type RpcClient } from '../app/utils/parentMode'
import { useSyncStore, NOT_SAVED_NOTE } from '../app/stores/sync'
import { useChildStore } from '../app/stores/child'

describe('pin pad rules', () => {
  it('accepts digits up to 6 and ignores the rest', () => {
    expect(appendDigit('123456', '7')).toBe('123456')
    expect(appendDigit('12', 'a')).toBe('12')
    expect(appendDigit('12', '3')).toBe('123')
    expect(removeLastDigit('123')).toBe('12')
    expect(removeLastDigit('')).toBe('')
  })
  it('masks and validates', () => {
    expect(maskPin('1234')).toBe('••••')
    expect(canSubmitPin('123')).toBe(false)
    expect(canSubmitPin('1234')).toBe(true)
    expect(canSubmitPin('1234567')).toBe(false)
    expect(canSubmitPin('12a4')).toBe(false)
  })
})

describe('friendly errors', () => {
  it('maps PIN errors', () => {
    expect(pinErrorMessage({ message: 'Too many wrong PINs. Try again.' })).toBe(PIN_MESSAGES.locked)
    expect(pinErrorMessage('PIN must be 4 to 6 digits')).toBe(PIN_MESSAGES.format)
    expect(pinErrorMessage({ message: 'Current PIN is wrong' })).toBe(PIN_MESSAGES.currentWrong)
    expect(pinErrorMessage({ message: 'Sign out and sign in again' })).toBe(PIN_MESSAGES.freshSignIn)
    expect(pinErrorMessage({ message: 'Not signed in' })).toBe(PIN_MESSAGES.notSignedIn)
    expect(pinErrorMessage({ message: 'No PIN set yet' })).toBe('Set a PIN first.')
    expect(pinErrorMessage(null)).toBe(PIN_MESSAGES.generic)
  })
  it('maps auth errors', () => {
    expect(authErrorMessage({ message: 'Invalid login credentials' })).toContain('not right')
    expect(authErrorMessage({ message: 'User already registered' })).toContain('already has an account')
    expect(authErrorMessage({ message: 'Email not confirmed' })).toContain('confirm')
    expect(authErrorMessage({ message: 'Password should be at least 6 characters' })).toContain('longer')
    expect(authErrorMessage({ message: 'Unable to validate email address: invalid format' })).toContain('email')
    expect(authErrorMessage({ message: 'email rate limit exceeded' })).toContain('wait')
    expect(authErrorMessage({ message: 'Failed to fetch' })).toContain('internet')
    expect(authErrorMessage(42)).toContain('Something went wrong')
  })
})

describe('attempt rows', () => {
  it('writes the problem as plain text and keeps values inside the table limits', () => {
    expect(problemToText({ op: 'subtract', a: { whole: 8, num: 1, den: 5 }, b: { whole: 4, num: 3, den: 4 } })).toBe('8 1/5 - 4 3/4')
    const row = attemptRow(
      { mode: 'practice', problem: 'x'.repeat(300), correct: true, firstTry: true, hintsUsed: 99, errorType: null },
      'f1',
      'c1',
    )
    expect(row.problem).toHaveLength(200)
    expect(row.hints_used).toBe(10)
    expect(row).toMatchObject({ family_id: 'f1', child_id: 'c1', first_try: true })
    expect(attemptRow({ mode: 'tutor', problem: 'p', correct: false, firstTry: false, hintsUsed: -3, errorType: 'x' }, 'f', 'c').hints_used).toBe(0)
  })
})

describe('parent mode', () => {
  function fake(responses: Record<string, { data?: unknown; error?: unknown }>) {
    const rpc = vi.fn(async (name: string) => ({ data: null, error: null, ...responses[name] }))
    return { rpc } as unknown as RpcClient & { rpc: ReturnType<typeof vi.fn> }
  }
  const memory = () => {
    const m = new Map<string, string>()
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }
  }

  it('unlocks with the right PIN and not with a wrong one', async () => {
    const ends = new Date(Date.now() + 60_000).toISOString()
    const ok = createParentMode(fake({ unlock_parent_mode: { data: ends } }), { storage: memory() })
    expect(await ok.unlock('1234')).toEqual({ ok: true })
    expect(ok.unlocked.value).toBe(true)
    ok.stopTimer()

    const bad = createParentMode(fake({ unlock_parent_mode: { data: null } }), { storage: memory() })
    expect(await bad.unlock('0000')).toEqual({ ok: false, error: PIN_MESSAGES.wrong })
    expect(bad.unlocked.value).toBe(false)

    const locked = createParentMode(fake({ unlock_parent_mode: { error: { message: 'Too many wrong PINs' } } }), { storage: memory() })
    expect(await locked.unlock('0000')).toEqual({ ok: false, error: PIN_MESSAGES.locked })

    const junk = createParentMode(fake({ unlock_parent_mode: { data: 'nope' } }), { storage: memory() })
    expect((await junk.unlock('1234')).ok).toBe(false)
  })

  it('locks itself when the time runs out', async () => {
    vi.useFakeTimers()
    const client = fake({ unlock_parent_mode: { data: new Date(Date.now() + 2000).toISOString() } })
    const mode = createParentMode(client, { storage: memory(), tickMs: 500 })
    await mode.unlock('1234')
    expect(mode.unlocked.value).toBe(true)
    expect(mode.secondsLeft.value).toBeGreaterThan(0)
    vi.advanceTimersByTime(3000)
    expect(mode.unlocked.value).toBe(false)
    expect(client.rpc).toHaveBeenCalledWith('lock_parent_mode')
    vi.useRealTimers()
  })

  it('refresh: reads PIN state, and locks when the database says unlocked but no end time is known', async () => {
    const client = fake({ has_parent_pin: { data: true }, is_parent_unlocked: { data: true } })
    const mode = createParentMode(client, { storage: memory() })
    await mode.refresh()
    expect(mode.hasPin.value).toBe(true)
    expect(mode.unlocked.value).toBe(false)
    expect(client.rpc).toHaveBeenCalledWith('lock_parent_mode')

    const storage = memory()
    storage.setItem('mathsprout.parentModeEnds', String(Date.now() + 60_000))
    const again = createParentMode(client, { storage })
    await again.refresh()
    expect(again.unlocked.value).toBe(true)
    again.stopTimer()

    const failing = createParentMode(fake({ has_parent_pin: { error: {} }, is_parent_unlocked: { error: {} } }), { storage: memory() })
    await failing.refresh()
    expect(failing.hasPin.value).toBeNull()
  })

  it('setPin and resetPin report errors and end any unlock', async () => {
    const client = fake({})
    const mode = createParentMode(client, { storage: memory(), expiresAt: ref(Date.now() + 5000) })
    expect(await mode.setPin('1234', '0000')).toEqual({ ok: true })
    expect(client.rpc).toHaveBeenCalledWith('set_parent_pin', { new_pin: '1234', current_pin: '0000' })
    expect(mode.unlocked.value).toBe(false)
    expect(await mode.resetPin('4321')).toEqual({ ok: true })

    const bad = createParentMode(fake({ set_parent_pin: { error: { message: 'Current PIN is wrong' } }, reset_parent_pin: { error: { message: 'Sign out and sign in again' } } }), { storage: memory() })
    expect(await bad.setPin('1234')).toEqual({ ok: false, error: PIN_MESSAGES.currentWrong })
    expect(await bad.resetPin('1234')).toEqual({ ok: false, error: PIN_MESSAGES.freshSignIn })
  })
})

describe('sync store', () => {
  const input = { mode: 'practice' as const, problem: '1 + 1', correct: true, firstTry: true, hintsUsed: 0, errorType: null }

  it('saves nothing without a child or family', async () => {
    setActivePinia(createPinia())
    const sync = useSyncStore()
    const save = vi.fn(async () => true)
    sync.configure({ save, familyId: async () => 'f', childId: () => null })
    await sync.record(input)
    sync.configure({ save, familyId: async () => null, childId: () => 'c' })
    await sync.record(input)
    expect(save).not.toHaveBeenCalled()
  })

  it('keeps a failed row, shows a note, and sends it with the next one', async () => {
    setActivePinia(createPinia())
    const sync = useSyncStore()
    let ok = false
    const save = vi.fn(async () => ok)
    sync.configure({ save, familyId: async () => 'f', childId: () => 'c' })
    await sync.record(input)
    expect(sync.failed).toBe(true)
    expect(sync.note).toBe(NOT_SAVED_NOTE)
    expect(sync.pending).toHaveLength(1)
    ok = true
    await sync.record(input)
    expect(sync.pending).toHaveLength(0)
    expect(sync.note).toBe('')
    sync.clear()
  })
})

describe('child store', () => {
  it('forgets a remembered child who no longer exists', () => {
    setActivePinia(createPinia())
    const store = useChildStore()
    store.select('gone')
    store.setChildren([{ id: 'a', nickname: 'A', grade: 4 }, { id: 'b', nickname: 'B', grade: 4 }])
    expect(store.selectedId).toBeNull()
    store.select('a')
    expect(store.selected?.nickname).toBe('A')
    store.setChildren([{ id: 'a', nickname: 'A', grade: 4 }, { id: 'b', nickname: 'B', grade: 4 }])
    expect(store.selectedId).toBe('a')
  })
})

describe('PinPad rules', () => {
  it('limits to 6 digits and never shows digits', () => {
    let pin = ''
    for (const k of '12345678') pin = appendDigit(pin, k)
    expect(pin).toBe('123456')
    expect(maskPin(pin)).toBe('••••••')
    expect(maskPin(pin)).not.toMatch(/[0-9]/)
  })
})

describe('child store with one child', () => {
  it('picks the only child automatically', () => {
    setActivePinia(createPinia())
    const store = useChildStore()
    store.select(null)
    store.setChildren([{ id: 'solo', nickname: 'Sam', grade: null }])
    expect(store.selected?.nickname).toBe('Sam')
    store.select(null)
    store.setChildren([{ id: 'a', nickname: 'A', grade: null }, { id: 'b', nickname: 'B', grade: null }])
    expect(store.selectedId).toBeNull()
  })
})

describe('ideas', () => {
  it('splits waiting and reviewed ideas and counts stars', async () => {
    const { groupIdeas } = await import('../app/utils/ideas')
    const base = { child_id: 'c', set_number: 1 }
    const g = groupIdeas([
      { ...base, id: '1', text: 'a', approved: null },
      { ...base, id: '2', text: 'b', approved: true },
      { ...base, id: '3', text: 'c', approved: false },
    ])
    expect(g.pending.map((r) => r.id)).toEqual(['1'])
    expect(g.reviewed).toHaveLength(2)
    expect(g.stars).toBe(1)
  })

  it('saves ideas for the chosen child, retries once, and notes a failure', async () => {
    setActivePinia(createPinia())
    const sync = useSyncStore()
    const saveIdea = vi.fn(async () => false)
    sync.configure({ save: async () => true, saveIdea, familyId: async () => 'f', childId: () => 'c' })
    await sync.recordIdeas(2, ['pizza'])
    expect(saveIdea).toHaveBeenCalledTimes(2)
    expect(saveIdea).toHaveBeenCalledWith({ family_id: 'f', child_id: 'c', set_number: 2, text: 'pizza' })
    expect(sync.failed).toBe(true)

    const ok = vi.fn(async () => true)
    sync.configure({ save: async () => true, saveIdea: ok, familyId: async () => 'f', childId: () => null })
    await sync.recordIdeas(1, ['x'])
    expect(ok).not.toHaveBeenCalled()
  })
})

describe('stars', () => {
  it('adds idea stars and Proof Masters and words them kindly', async () => {
    const { totalStars, starBreakdown, starMessage } = await import('../app/utils/stars')
    expect(totalStars({ ideas: 2, proofMasters: 1, daysDone: 0 })).toBe(3)
    expect(starBreakdown({ ideas: 2, proofMasters: 1, daysDone: 0 })).toBe('2 from ideas and 1 Proof Master')
    expect(starBreakdown({ ideas: 1, proofMasters: 2, daysDone: 0 })).toBe('1 from an idea and 2 Proof Masters')
    expect(starBreakdown({ ideas: 0, proofMasters: 0, daysDone: 0 })).toBe('')
    expect(totalStars({ ideas: 1, proofMasters: 1, daysDone: 3 })).toBe(5)
    expect(starBreakdown({ ideas: 1, proofMasters: 1, daysDone: 3 })).toBe('1 from an idea, 1 Proof Master and 3 finished days')
    expect(starBreakdown({ ideas: 0, proofMasters: 0, daysDone: 1 })).toBe('1 finished day')
    expect(starMessage(0)).toBe('Your first star is waiting')
    expect(starMessage(1)).toBe('1 star. Nice start!')
    expect(starMessage(5)).toBe('5 stars. Nice work!')
  })

  it('saves a Proof Master award once, with a retry, for the chosen child', async () => {
    setActivePinia(createPinia())
    const sync = useSyncStore()
    const saveAward = vi.fn(async () => false)
    sync.configure({ save: async () => true, saveAward, familyId: async () => 'f', childId: () => 'c' })
    await sync.recordAward('proof_master')
    expect(saveAward).toHaveBeenCalledTimes(2)
    expect(saveAward).toHaveBeenCalledWith({ family_id: 'f', child_id: 'c', kind: 'proof_master' })
    expect(sync.failed).toBe(true)
  })
})

describe('avatars', () => {
  it('shows a listed animal and falls back for anything else', async () => {
    const { avatarOf, DEFAULT_AVATAR, AVATARS } = await import('../app/utils/avatars')
    expect(avatarOf('🐰')).toBe('🐰')
    expect(avatarOf('<script>')).toBe(DEFAULT_AVATAR)
    expect(avatarOf(null)).toBe(DEFAULT_AVATAR)
    expect(new Set(AVATARS.map((a) => a.emoji)).size).toBe(AVATARS.length)
  })
})

describe('idea memory and the one-week rule', () => {
  it('keeps the 3 newest reviewed ideas per child and never hides the waiting ones', async () => {
    const { recentReviewed, groupIdeas, canChangeReview } = await import('../app/utils/ideas')
    const rows = [1, 2, 3, 4, 5].map((n) => ({
      id: `a${n}`, child_id: 'a', set_number: n, text: `t${n}`, approved: true as boolean | null, reviewed_at: `2026-10-0${n}T00:00:00Z`,
    }))
    rows.push({ id: 'b1', child_id: 'b', set_number: 1, text: 'b', approved: false, reviewed_at: '2026-10-01T00:00:00Z' })
    rows.push({ id: 'p', child_id: 'a', set_number: 6, text: 'waiting', approved: null, reviewed_at: null as never })
    const kept = recentReviewed(rows).map((r) => r.id)
    expect(kept.filter((id) => id.startsWith('a'))).toEqual(['a5', 'a4', 'a3'])
    expect(kept).toContain('b1')
    expect(groupIdeas(rows).pending.map((r) => r.id)).toEqual(['p'])

    const now = new Date('2026-10-20T00:00:00Z')
    expect(canChangeReview('2026-10-15T00:00:00Z', now)).toBe(true)
    expect(canChangeReview('2026-10-12T00:00:00Z', now)).toBe(false)
    expect(canChangeReview(null, now)).toBe(true)
  })
})
