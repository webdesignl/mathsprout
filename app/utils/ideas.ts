export interface IdeaRow {
  id: string
  child_id: string
  set_number: number
  text: string
  approved: boolean | null
}

/** Splits ideas into waiting and reviewed, and counts the stars. */
export function groupIdeas(rows: IdeaRow[]) {
  return {
    pending: rows.filter((r) => r.approved === null),
    reviewed: rows.filter((r) => r.approved !== null),
    stars: rows.filter((r) => r.approved === true).length,
  }
}
