/** PinPad rules, kept apart from the screen so they can be tested. The PIN lives only in the pad while she types. */
export const PIN_MIN = 4
export const PIN_MAX = 6

/** Adds a digit. Anything that is not 0 to 9, or past the longest PIN, is ignored. */
export function appendDigit(current: string, key: string, max: number = PIN_MAX): string {
  if (!/^[0-9]$/.test(key) || current.length >= max) return current
  return current + key
}

export function removeLastDigit(current: string): string {
  return current.slice(0, -1)
}

/** One dot per digit, so the PIN is never shown. */
export function maskPin(current: string): string {
  return '•'.repeat(current.length)
}

export function canSubmitPin(current: string, min: number = PIN_MIN, max: number = PIN_MAX): boolean {
  return current.length >= min && current.length <= max && /^[0-9]+$/.test(current)
}
