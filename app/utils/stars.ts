export interface StarCounts {
  /** Ideas a parent gave a star to. */
  ideas: number
  /** Proof Masters she earned. */
  proofMasters: number
}

export const NO_STARS: StarCounts = { ideas: 0, proofMasters: 0 }

export function totalStars(counts: StarCounts): number {
  return counts.ideas + counts.proofMasters
}

/** A short line for her, like "2 from ideas and 1 Proof Master". Empty when there is nothing to say. */
export function starBreakdown(counts: StarCounts): string {
  const parts: string[] = []
  if (counts.ideas > 0) parts.push(`${counts.ideas} from ${counts.ideas === 1 ? 'an idea' : 'ideas'}`)
  if (counts.proofMasters > 0) parts.push(`${counts.proofMasters} Proof Master${counts.proofMasters === 1 ? '' : 's'}`)
  return parts.join(' and ')
}

/** One short line for her, with the count in it. Zero never feels bad. */
export function starMessage(total: number): string {
  if (total === 0) return 'Your first star is waiting'
  if (total === 1) return '1 star. Nice start!'
  return `${total} stars. Nice work!`
}
