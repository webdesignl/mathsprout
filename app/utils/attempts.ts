import { formatMixed, opSymbol, type AnyProblem } from './fraction'

export type AttemptMode = 'practice' | 'deep_check' | 'tutor'

/** What a screen knows about one problem when it is finished. */
export interface AttemptInput {
  mode: AttemptMode
  /** The problem as text, like "8 1/5 - 4 3/4". */
  problem: string
  correct: boolean
  firstTry: boolean
  hintsUsed: number
  /** The slip the engine named, like "forgotRegroup", or null. */
  errorType: string | null
}

/** The row saved to the attempts table. The family comes from the signed-in account. */
export interface AttemptRow {
  family_id: string
  child_id: string
  mode: AttemptMode
  problem: string
  correct: boolean
  first_try: boolean
  hints_used: number
  error_type: string | null
}

/** The most the table allows (char_length(problem) <= 200). */
const MAX_PROBLEM_CHARS = 200
const MAX_HINTS = 10

/** "8 1/5 - 4 3/4". Plain text, so the parent can read it and no story or name is stored. */
export function problemToText(problem: AnyProblem): string {
  const sign = opSymbol(problem.op)
  return `${formatMixed(problem.a)} ${sign === '−' ? '-' : sign} ${formatMixed(problem.b)}`
}

/** Builds the row exactly as the table wants it, with values kept inside its limits. */
export function attemptRow(input: AttemptInput, familyId: string, childId: string): AttemptRow {
  return {
    family_id: familyId,
    child_id: childId,
    mode: input.mode,
    problem: input.problem.slice(0, MAX_PROBLEM_CHARS),
    correct: input.correct,
    first_try: input.firstTry,
    hints_used: Math.min(MAX_HINTS, Math.max(0, Math.floor(input.hintsUsed))),
    error_type: input.errorType,
  }
}
