import {
  checkAnswer,
  diagnose,
  estimateCheck,
  formatMixed,
  isNegative,
  parseMixed,
  problemAnswer,
  sizeCheck,
  simplify,
  toFraction,
  toImproper,
  verifyByInverse,
  workedSteps,
  type AnswerStatus,
  type AnyOp,
  type AnyProblem,
  type Diagnosis,
  type EstimateCheck,
  type SizeCheck,
  type Step,
} from './fraction'

/** What the engine playground shows for one calculation. Everything comes from the engine. */
export interface LabResult {
  /** The numbers could not be read (empty, bad fraction). Nothing else is filled in. */
  inputError: string | null
  problem: AnyProblem | null
  /** Set when the problem has no answer (dividing by zero). */
  mathError: string | null
  answer: { mixed: string; improper: string; negative: boolean } | null
  steps: Step[]
  inverse: { holds: boolean; expression: string } | null
  estimate: (EstimateCheck & { roundedAText: string; roundedBText: string; estimateText: string; differenceText: string }) | null
  size: SizeCheck | null
  student: {
    text: string
    /** Null when the answer could not be read. */
    status: AnswerStatus | null
    simplestForm: string
    diagnosis: Diagnosis
    /** The kind of the step the slip happened at, or null. */
    stepKind: string | null
    /** The size rule for her answer, for × and ÷. */
    size: SizeCheck | null
  } | null
}

/**
 * Runs everything the engine knows about one calculation: the answer, the worked steps, the inverse check,
 * the estimate, the size rule, and (with a student answer) checking and diagnosing it.
 * It only reports what the engine says, so it is safe to use as a window into the engine.
 */
export function analyze(op: AnyOp, aText: string, bText: string, studentText = ''): LabResult {
  const empty: LabResult = {
    inputError: null,
    problem: null,
    mathError: null,
    answer: null,
    steps: [],
    inverse: null,
    estimate: null,
    size: null,
    student: null,
  }

  const a = parseMixed(aText)
  const b = parseMixed(bText)
  if (!a || !b) {
    return { ...empty, inputError: 'Type both numbers, like 2 1/2, 3/4 or 5. The bottom number can not be zero.' }
  }
  const problem: AnyProblem = { op, a, b }
  const result: LabResult = { ...empty, problem, steps: workedSteps(problem) }

  const answer = problemAnswer(problem)
  if (!answer) {
    result.mathError = 'You can’t divide by zero.'
  } else {
    result.answer = {
      mixed: formatMixed(answer),
      improper: (() => {
        const f = simplify(toFraction(answer))
        return `${f.numerator}/${f.denominator}`
      })(),
      negative: isNegative(answer),
    }
    result.inverse = verifyByInverse(op, a, b, answer)
    if (!result.answer.negative) {
      const e = estimateCheck(a, b, op, answer)
      result.estimate = {
        ...e,
        roundedAText: formatMixed(e.roundedA),
        roundedBText: formatMixed(e.roundedB),
        estimateText: formatMixed(e.estimate),
        differenceText: formatMixed(e.difference),
      }
    }
    if (op === 'multiply' || op === 'divide') result.size = sizeCheck(op, a, b, answer)
  }

  const student = studentText.trim()
  if (student) {
    const parsed = parseMixed(student)
    const diagnosis = diagnose(problem, student)
    const checked = answer ? checkAnswer(answer, student) : null
    result.student = {
      text: student,
      status: parsed && checked ? checked.status : null,
      simplestForm: answer ? formatMixed(answer) : '',
      diagnosis,
      stepKind: diagnosis.stepIndex === null ? null : (result.steps[diagnosis.stepIndex]?.kind ?? null),
      size: parsed && (op === 'multiply' || op === 'divide') ? sizeCheck(op, a, b, toImproper(parsed)) : null,
    }
  }
  return result
}
