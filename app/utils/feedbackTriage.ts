/**
 * Cheap screening of problem reports before an AI agent reads them. Plain rules, no AI: drop junk, spam and
 * attempts to instruct the agent; hide personal details; group near-duplicates. Reports are untrusted public text.
 */
export interface ReportRow {
  id: string
  created_at: string
  severity: string | null
  issue: string
}

export type DropReason = 'too-short' | 'not-text' | 'repeated' | 'links' | 'instructions'

export interface KeptReport {
  id: string
  created_at: string
  severity: 'low' | 'medium' | 'high'
  /** The text with emails, phone numbers and links hidden. */
  text: string
  /** Every report id merged into this one (the first is the earliest). */
  refs: string[]
}

export interface ScreenResult {
  keep: KeptReport[]
  dropped: { id: string; reason: DropReason }[]
}

const MIN_LETTERS = 10
const DUPLICATE_SIMILARITY = 0.6

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g
const URL = /\b(?:https?:\/\/|www\.)\S+/gi
const PHONE = /(?<!\w)\+?\d[\d\s().-]{7,}\d/g

/** Wording that tries to give the agent orders. Such a report is never shown to the agent. */
const INSTRUCTIONS = [
  /ignore\s+(?:all\s+|any\s+|the\s+)?(?:previous|prior|above|earlier)/i,
  /disregard\s+(?:all\s+|any\s+|the\s+|your\s+)?(?:previous|prior|above|instructions|rules)/i,
  /\b(?:system|developer)\s+prompt\b/i,
  /you\s+are\s+now\b/i,
  /\bact\s+as\b/i,
  /<\/?\s*(?:script|system|assistant|instructions?)\b/i,
  /\b(?:rm\s+-rf|curl\s|wget\s|sudo\s|chmod\s)/i,
  /\b(?:api[_ -]?key|secret|token|password)\b.*\b(?:print|send|post|reveal|show|exfiltrate)\b/i,
  /\b(?:print|send|post|reveal|show|exfiltrate)\b.*\b(?:api[_ -]?key|secret|token|password)\b/i,
  /\b(?:delete|drop|truncate)\s+(?:the\s+)?(?:table|database|repo|branch|all)\b/i,
  /\bgit\s+push\b/i,
  /\bmerge\s+(?:this|the)\s+pr\b/i,
]

/** Hides emails, phone numbers and links so they never reach the agent or a public issue. */
export function redact(text: string): string {
  return text.replace(EMAIL, '[email]').replace(URL, '[link]').replace(PHONE, '[number]')
}

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  )
}

/** Share of words two reports have in common, 0 to 1. */
export function similarity(a: string, b: string): number {
  const x = words(a)
  const y = words(b)
  if (x.size === 0 || y.size === 0) return 0
  let shared = 0
  for (const w of x) if (y.has(w)) shared++
  return shared / (x.size + y.size - shared)
}

function dropReason(text: string): DropReason | null {
  if (INSTRUCTIONS.some((re) => re.test(text))) return 'instructions'
  const letters = (text.match(/\p{L}/gu) ?? []).length
  if (letters < MIN_LETTERS) return 'too-short'
  if (letters / text.replace(/\s/g, '').length < 0.5) return 'not-text'
  if (/(.)\1{7,}/u.test(text)) return 'repeated'
  const list = text.toLowerCase().split(/\s+/).filter(Boolean)
  const counts = new Map<string, number>()
  for (const w of list) counts.set(w, (counts.get(w) ?? 0) + 1)
  if (list.length >= 8 && Math.max(...counts.values()) / list.length > 0.5) return 'repeated'
  if ((text.match(URL) ?? []).length >= 2) return 'links'
  return null
}

const RANK = { low: 0, medium: 1, high: 2 } as const
const asSeverity = (s: string | null): KeptReport['severity'] => (s === 'low' || s === 'high' ? s : 'medium')

/** Screens the reports, hides personal details and merges near-duplicates (the highest severity wins). */
export function screenReports(rows: ReportRow[]): ScreenResult {
  const dropped: ScreenResult['dropped'] = []
  const keep: KeptReport[] = []
  const ordered = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))
  for (const row of ordered) {
    const reason = dropReason(row.issue.trim())
    if (reason) {
      dropped.push({ id: row.id, reason })
      continue
    }
    const text = redact(row.issue.trim())
    const severity = asSeverity(row.severity)
    const same = keep.find((k) => similarity(k.text, text) >= DUPLICATE_SIMILARITY)
    if (same) {
      same.refs.push(row.id)
      if (RANK[severity] > RANK[same.severity]) same.severity = severity
    } else {
      keep.push({ id: row.id, created_at: row.created_at, severity, text, refs: [row.id] })
    }
  }
  return { keep, dropped }
}
