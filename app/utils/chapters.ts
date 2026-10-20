import type { ProblemOp } from './problems'

/** The operations she can tick inside the Fractions chapter. */
export type ChapterOp = 'add' | 'subtract' | 'multiply' | 'divide'

export const CHAPTER_OPS: { op: ChapterOp; label: string }[] = [
  { op: 'add', label: 'Add' },
  { op: 'subtract', label: 'Subtract' },
  { op: 'multiply', label: 'Multiply' },
  { op: 'divide', label: 'Divide' },
]

export interface Chapter {
  id: string
  title: string
  summary: string
  /** Chapters that are not ready show "Coming soon" and cannot be started. */
  ready: boolean
  /** Extra words the search also matches, like "add". */
  keywords: string[]
}

export const GRADES = [{ value: 4, label: 'Grade 4' }]

export const CHAPTERS: Chapter[] = [
  {
    id: 'fractions',
    title: 'Fractions',
    summary: 'Add, subtract, multiply and divide fractions and mixed numbers.',
    ready: true,
    keywords: ['fraction', 'add', 'subtract', 'multiply', 'divide', 'mixed number', 'story', 'word problem'],
  },
  { id: 'decimals', title: 'Decimals', summary: 'Tenths, hundredths and more.', ready: false, keywords: ['decimal', 'tenths'] },
  { id: 'place-value', title: 'Place value', summary: 'Digits, thousands and rounding.', ready: false, keywords: ['place', 'value', 'digits', 'round'] },
]

/** Chapters whose name or keywords match what she typed. An empty search shows every chapter. */
export function filterChapters(query: string, chapters: Chapter[] = CHAPTERS): Chapter[] {
  const q = query.trim().toLowerCase()
  if (!q) return chapters
  return chapters.filter((c) => [c.title, ...c.keywords].some((word) => word.toLowerCase().includes(q)))
}

/** The setup passed to the practice store for a chosen set of operations. */
export function setupFor(ops: ChapterOp[]): { op: ProblemOp; ops: ChapterOp[] } {
  return { op: ops.length === 1 ? ops[0]! : 'all', ops }
}
