import { computed, ref, type Ref } from 'vue'
import { pinErrorMessage, PIN_MESSAGES } from './friendlyErrors'

/** The only part of the Supabase client parent mode needs: calling the database functions. */
export interface RpcClient {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>
}

export type PinResult = { ok: true } | { ok: false; error: string }

export interface ParentModeOptions {
  hasPin?: Ref<boolean | null>
  /** When parent mode ends, in milliseconds since 1970. */
  expiresAt?: Ref<number | null>
  now?: Ref<number>
  /** Where the end time is kept so a page reload doesn't lose it. Never holds a PIN. */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
  /** How often the countdown ticks. Tests pass fake timers. */
  tickMs?: number
}

const EXPIRY_KEY = 'mathsprout.parentModeEnds'

function sessionStore(): ParentModeOptions['storage'] {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

/**
 * Parent mode, as seen by the app. The database decides everything: the PIN is checked there, a wrong PIN
 * counts toward a lockout there, and parent-only changes are refused there when the unlock has run out.
 * This only calls the database functions and keeps a countdown so the screen locks when the time is up.
 * The PIN is passed straight to the database and is never stored or logged here.
 */
export function createParentMode(client: RpcClient, options: ParentModeOptions = {}) {
  const hasPin = options.hasPin ?? ref<boolean | null>(null)
  const expiresAt = options.expiresAt ?? ref<number | null>(null)
  const now = options.now ?? ref(Date.now())
  const storage = options.storage === undefined ? sessionStore() : options.storage
  const tickMs = options.tickMs ?? 1000
  let timer: ReturnType<typeof setInterval> | null = null

  const unlocked = computed(() => expiresAt.value !== null && expiresAt.value > now.value)
  const secondsLeft = computed(() =>
    expiresAt.value === null ? 0 : Math.max(0, Math.ceil((expiresAt.value - now.value) / 1000)),
  )

  function remember(value: number | null) {
    try {
      if (value === null) storage?.removeItem(EXPIRY_KEY)
      else storage?.setItem(EXPIRY_KEY, String(value))
    } catch {
      // Storage may be blocked. The database still decides.
    }
  }

  function stopTimer() {
    if (timer !== null) clearInterval(timer)
    timer = null
  }

  /** Locks the screen as soon as the time is up. The database has already stopped allowing changes by then. */
  function tick() {
    now.value = Date.now()
    if (expiresAt.value !== null && expiresAt.value <= now.value) {
      expiresAt.value = null
      remember(null)
      stopTimer()
      void client.rpc('lock_parent_mode')
    }
  }

  function startTimer() {
    stopTimer()
    if (expiresAt.value === null) return
    timer = setInterval(tick, tickMs)
  }

  function setExpiry(value: number | null) {
    now.value = Date.now()
    expiresAt.value = value
    remember(value)
    if (value === null) stopTimer()
    else startTimer()
  }

  /** Asks the database whether a PIN exists and whether this session is unlocked. */
  async function refresh(): Promise<void> {
    const pin = await client.rpc('has_parent_pin')
    hasPin.value = pin.error ? null : pin.data === true

    const state = await client.rpc('is_parent_unlocked')
    if (state.error || state.data !== true) {
      setExpiry(null)
      return
    }
    // The database says unlocked, but only unlock() tells us when it ends. If we don't know, lock to be safe.
    const saved = Number(storage?.getItem(EXPIRY_KEY) ?? '')
    if (Number.isFinite(saved) && saved > Date.now()) {
      setExpiry(saved)
    } else {
      await lock()
    }
  }

  /** Right PIN: parent mode starts. Wrong PIN: the database counted it, and nothing changes. */
  async function unlock(pin: string): Promise<PinResult> {
    const { data, error } = await client.rpc('unlock_parent_mode', { pin })
    if (error) return { ok: false, error: pinErrorMessage(error) }
    if (data === null || data === undefined) return { ok: false, error: PIN_MESSAGES.wrong }
    const ends = Date.parse(String(data))
    if (Number.isNaN(ends)) return { ok: false, error: PIN_MESSAGES.generic }
    setExpiry(ends)
    return { ok: true }
  }

  async function lock(): Promise<void> {
    setExpiry(null)
    await client.rpc('lock_parent_mode')
  }

  /** First PIN, or a new PIN with the current one. */
  async function setPin(newPin: string, currentPin?: string): Promise<PinResult> {
    const args: Record<string, unknown> = { new_pin: newPin }
    if (currentPin !== undefined) args.current_pin = currentPin
    const { error } = await client.rpc('set_parent_pin', args)
    if (error) return { ok: false, error: pinErrorMessage(error) }
    hasPin.value = true
    // Setting a PIN ends any unlock; she enters the new PIN to start again.
    setExpiry(null)
    return { ok: true }
  }

  /** Forgot the PIN: allowed only soon after signing in with the password (the database checks). */
  async function resetPin(newPin: string): Promise<PinResult> {
    const { error } = await client.rpc('reset_parent_pin', { new_pin: newPin })
    if (error) return { ok: false, error: pinErrorMessage(error) }
    hasPin.value = true
    setExpiry(null)
    return { ok: true }
  }

  return { hasPin, unlocked, expiresAt, secondsLeft, refresh, unlock, lock, setPin, resetPin, stopTimer }
}

export type ParentMode = ReturnType<typeof createParentMode>
