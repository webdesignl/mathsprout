import {
  addSteps,
  diagnose,
  subtractSteps,
  type Diagnosis,
  type Problem,
  type Slip,
  type Step,
  type StepKind,
} from './fraction'

/**
 * Hints written by hand: one question each, at most 20 words, no answers and no step results.
 * They are the safety net, so the tutor always works even when the AI is down or slips.
 * Level 1 points at the key idea, level 2 narrows it, level 3 nearly gives the step.
 */
export const LEVEL_HINTS: Record<StepKind, [string, string, string]> = {
  rename: [
    'What do you need to do first when the bottom numbers are different?',
    'Can you find a number that both bottom numbers go into?',
    'Try the smallest number both bottoms go into. What are the new top numbers?',
  ],
  regroup: [
    'Look at the top numbers. Is there enough to take away?',
    'Is the first top number big enough to take the second one away?',
    'What happens if you break 1 whole into pieces the same size as the bottom number?',
  ],
  addWholes: [
    'What do you do with the whole numbers?',
    'Can you add the whole numbers on their own first?',
    'Add just the whole numbers and leave the fractions aside. What is that?',
  ],
  subtractWholes: [
    'What do you do with the whole numbers?',
    'After borrowing, can you take away the whole numbers on their own?',
    'Subtract just the whole numbers and leave the fractions aside. What is left?',
  ],
  addNumerators: [
    'What do you do with the top numbers once the bottoms match?',
    'Do the bottom numbers change when you add the tops?',
    'Add only the top numbers and keep the bottom the same. What do you get?',
  ],
  subtractNumerators: [
    'What do you do with the top numbers once the bottoms match?',
    'Do the bottom numbers change when you subtract the tops?',
    'Take the second top number away from the first and keep the bottom. What is left?',
  ],
  simplify: [
    'Can the fraction be written with smaller numbers?',
    'Is there a number that goes into both the top and the bottom?',
    'Divide the top and the bottom by the same number. Which number works?',
  ],
  toMixed: [
    'Is the fraction part bigger than 1 whole?',
    'How many whole ones are hiding in the fraction part?',
    'Divide the top by the bottom. How many wholes fit, and what is left?',
  ],
  negative: [
    'Which number should come first?',
    'Can you take away more than you have?',
    'Which of the two numbers is bigger?',
  ],
  answer: [
    'How can you put the whole number and the fraction together?',
    'What do the whole number and the fraction make together?',
    'Write the whole number first, then the fraction. What does it look like?',
  ],
}

/** Extra level 2 and 3 hints for mixing up the operation, since no step is at fault. */
const WRONG_OPERATION: [string, string] = [
  'Does the problem put amounts together, or take some away?',
  'If the problem asks how much is left, which operation fits?',
]

/** The engine's own level 1 hint for each slip (one short question). */
export function templateHint(
  diagnosis: Diagnosis | null,
  stepKind: StepKind,
  level: 1 | 2 | 3,
): string {
  const slip: Slip = diagnosis?.slip ?? 'none'
  if (slip === 'wrongOperation') {
    return level === 1 ? diagnosis!.hint : WRONG_OPERATION[level === 2 ? 0 : 1]!
  }
  if (level === 1 && diagnosis && slip !== 'none' && slip !== 'unknown' && diagnosis.hint) {
    return diagnosis.hint
  }
  return LEVEL_HINTS[stepKind][level - 1]!
}

export interface HintTarget {
  steps: Step[]
  /** The step a hint is about: where diagnose says the slip happened, or the first step. */
  flaggedIndex: number
  diagnosis: Diagnosis | null
}

/** Which step a hint should aim at. The engine decides; nothing here is a guess. */
export function hintTarget(problem: Problem, studentAnswer: string | undefined, stuck: boolean): HintTarget {
  const steps = problem.op === 'add' ? addSteps(problem.a, problem.b) : subtractSteps(problem.a, problem.b)
  const answerText = studentAnswer?.trim() ?? ''
  const diagnosis = answerText ? diagnose(problem, answerText) : null
  const flagged = !stuck && diagnosis && diagnosis.stepIndex !== null ? diagnosis.stepIndex : 0
  return { steps, flaggedIndex: Math.min(flagged, Math.max(0, steps.length - 1)), diagnosis }
}

/**
 * A hint made entirely in the browser, for when the tutor server can't be reached.
 * One short question, never an answer. Same templates the server falls back to.
 */
export function localHint(
  problem: Problem,
  studentAnswer: string | undefined,
  stuck: boolean,
  level: 1 | 2 | 3,
): string {
  const target = hintTarget(problem, studentAnswer, stuck)
  return templateHint(target.diagnosis, target.steps[target.flaggedIndex]?.kind ?? 'rename', level)
}
