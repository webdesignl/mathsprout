export interface IdeaRow {
  id: string
  child_id: string
  set_number: number
  text: string
  approved: boolean | null
  reviewed_at?: string | null
  created_at?: string
}

/** A parent can change a review for a week after first making it. The database enforces the same rule. */
export const REVIEW_WINDOW_DAYS = 7
/** How many reviewed ideas are kept and shown per child. */
export const KEEP_REVIEWED = 3

export function canChangeReview(reviewedAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!reviewedAt) return true
  return now.getTime() - new Date(reviewedAt).getTime() <= REVIEW_WINDOW_DAYS * 86_400_000
}

/** Waiting ideas, the most recent reviewed ones (newest first), and the stars among those shown. */
export function groupIdeas(rows: IdeaRow[]) {
  const pending = rows.filter((r) => r.approved === null)
  const reviewed = rows
    .filter((r) => r.approved !== null)
    .sort((a, b) => (b.reviewed_at ?? b.created_at ?? '').localeCompare(a.reviewed_at ?? a.created_at ?? ''))
  return {
    pending,
    reviewed,
    stars: rows.filter((r) => r.approved === true).length,
  }
}

/** Keeps the newest reviewed ideas for each child; the rest are older and the database deletes them. */
export function recentReviewed(rows: IdeaRow[], keep: number = KEEP_REVIEWED): IdeaRow[] {
  const byChild = new Map<string, IdeaRow[]>()
  for (const r of groupIdeas(rows).reviewed) byChild.set(r.child_id, [...(byChild.get(r.child_id) ?? []), r])
  return [...byChild.values()].flatMap((list) => list.slice(0, keep))
}
