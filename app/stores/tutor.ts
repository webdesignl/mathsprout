import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  checkAnswer,
  diagnose,
  equals,
  estimateCheck,
  formatMixed,
  inverseProblem,
  opSymbol,
  parseMixed,
  problemAnswer,
  toImproper,
  workedSteps,
  type AnswerStatus,
  type AnyProblem,
  type EstimateCheck,
  type Operand,
  type Slip,
  type Step,
} from '../utils/fraction'
import { PROOF_SLIP_MESSAGES, WRONG_MESSAGES, pickDifferent, proofHint } from '../utils/messages'
import { localHint } from '../utils/tutorHints'
import {
  createTutorApi,
  problemError,
  type ExplainReply,
  type ReadBody,
  type TutorApi,
} from '../utils/tutorApi'
import type { Proof } from './practice'

/**
 * The Tutor is a state machine, one thing on screen at a time:
 * capture -> confirm -> attempt -> hint1 -> hint2 -> hint3 -> teach -> check -> explain -> done.
 * The fraction engine decides whether an answer is right. The AI only reads the problem, writes
 * hint questions and gives feedback on her explanation.
 */
export type TutorState =
  | 'capture'
  | 'confirm'
  | 'attempt'
  | 'hint1'
  | 'hint2'
  | 'hint3'
  | 'teach'
  | 'check'
  | 'explain'
  | 'done'

export type CheckMethod = 'addBack' | 'estimate'
export type ProblemSource = 'photo' | 'typed' | 'text'
export type Busy = 'reading' | 'hint' | 'explain' | null
export type Verdict = 'clear' | 'partly' | 'missing'

/** Where a wrong answer or "I'm stuck" leads next. From teach she keeps trying with the steps in view. */
const NEXT_HELP = {
  attempt: 'hint1',
  hint1: 'hint2',
  hint2: 'hint3',
  hint3: 'teach',
} as const

const ANSWERING: TutorState[] = ['attempt', 'hint1', 'hint2', 'hint3', 'teach']
const WRONG_ADD_BACKS_BEFORE_STEPS = 2
const WRONG_ROUNDS_BEFORE_REVEAL = 2
const WRONG_CLOSE_BEFORE_REVEAL = 2
/** She gets one extra try after a follow-up question about her explanation. */
const MAX_EXPLANATION_TRIES = 2

export const SUMMARY_NOT_CLEAR = 'We can look at the explanation together next time.'

/** The correct answer. A problem that divides by zero never gets this far (it is rejected on entry). */
function answerOf(problem: AnyProblem): Operand {
  return problemAnswer(problem) ?? { numerator: 0, denominator: 1 }
}

function stepsOf(problem: AnyProblem): Step[] {
  return workedSteps(problem)
}

function levelOf(state: 'hint1' | 'hint2' | 'hint3'): 1 | 2 | 3 {
  return state === 'hint1' ? 1 : state === 'hint2' ? 2 : 3
}

export const useTutorStore = defineStore('tutor', () => {
  // The server calls go through this, so tests can swap in a fake.
  // $fetch is looked up when a request is made, so tests (which have no $fetch) can load this file.
  type Fetcher = (url: string, options: { method: 'POST'; body: unknown }) => Promise<unknown>
  let api: TutorApi = createTutorApi((url, body) =>
    (globalThis as unknown as { $fetch: Fetcher }).$fetch(url, { method: 'POST', body }),
  )
  function setApi(next: TutorApi) {
    api = next
  }

  const state = ref<TutorState>('capture')
  const source = ref<ProblemSource | null>(null)
  const problem = ref<AnyProblem | null>(null)
  const problemText = ref('')
  const confidence = ref<'high' | 'low'>('high')

  const attempts = ref(0)
  const lastAnswer = ref('')
  /** Her latest answer that was not right. The Learn panel and hints compare against it. */
  const lastWrongAnswer = ref('')
  /** The correct answer she gave. */
  const acceptedAnswer = ref('')
  const notSimplest = ref(false)
  const wrongMessage = ref('')
  const lastWrongMessage = ref<string | null>(null)

  const hints = ref<string[]>([])
  /** True when a hint came from the app itself because the tutor could not be reached. */
  const hintsOffline = ref(false)
  const slip = ref<Slip | null>(null)
  const reachedTeach = ref(false)

  const chosenCheck = ref<CheckMethod | null>(null)
  const checkMethod = ref<CheckMethod | null>(null)
  const checkDone = ref(false)

  const addBack = ref({
    wrong: 0,
    hint: null as string | null,
    encouragement: null as string | null,
    steps: [] as Step[],
    result: null as AnswerStatus | null,
    done: false,
    helped: false,
  })
  const lastEncouragement = ref<string | null>(null)

  const estimate = ref({
    stage: 'round' as 'round' | 'compare',
    wrongRounds: 0,
    roundOk: null as { a: boolean; b: boolean } | null,
    revealed: false,
    wrongClose: 0,
    closeMessage: '',
  })

  const explanation = ref({
    text: '',
    tries: 0,
    verdict: null as Verdict | null,
    praise: '',
    followUp: '',
  })

  const busy = ref<Busy>(null)
  /** A short, kind message when something could not be done (offline, tutor busy). */
  const error = ref<string | null>(null)

  const hintsUsed = computed(() => hints.value.length)
  const expected = computed<Operand | null>(() => (problem.value ? answerOf(problem.value) : null))
  const canAnswer = computed(() => ANSWERING.includes(state.value) && !busy.value)
  const canBeStuck = computed(() => ['attempt', 'hint1', 'hint2', 'hint3'].includes(state.value) && !busy.value)

  /** The estimate for her (correct) answer: rounded numbers, what they make, and whether she is close. */
  const estimateInfo = computed<EstimateCheck | null>(() => {
    const parsed = parseMixed(acceptedAnswer.value)
    if (!problem.value || !parsed) return null
    return estimateCheck(problem.value.a, problem.value.b, problem.value.op, toImproper(parsed))
  })

  /** False when the numbers are too small to estimate (a divisor under 1/4). She uses the opposite operation then. */
  const estimateAvailable = computed(() => estimateInfo.value?.reliable !== false)

  /** The add-back, in the shape the shared proof component expects. */
  const addBackProof = computed<Proof | null>(() => {
    if (!problem.value || chosenCheck.value !== 'addBack') return null
    const inverse = inverseProblem(problem.value)
    const symbol = opSymbol(inverse.op)
    return {
      equation: `${formatMixed(inverse.a)} ${symbol} ${formatMixed(inverse.b)} = ?`,
      done: addBack.value.done,
      result: addBack.value.result,
      hint: addBack.value.hint,
      encouragement: addBack.value.encouragement,
      steps: addBack.value.steps,
      helped: addBack.value.helped,
    }
  })

  function reset() {
    state.value = 'capture'
    source.value = null
    problem.value = null
    problemText.value = ''
    confidence.value = 'high'
    attempts.value = 0
    lastAnswer.value = ''
    lastWrongAnswer.value = ''
    acceptedAnswer.value = ''
    notSimplest.value = false
    wrongMessage.value = ''
    hints.value = []
    hintsOffline.value = false
    slip.value = null
    reachedTeach.value = false
    chosenCheck.value = null
    checkMethod.value = null
    checkDone.value = false
    addBack.value = { wrong: 0, hint: null, encouragement: null, steps: [], result: null, done: false, helped: false }
    estimate.value = { stage: 'round', wrongRounds: 0, roundOk: null, revealed: false, wrongClose: 0, closeMessage: '' }
    explanation.value = { text: '', tries: 0, verdict: null, praise: '', followUp: '' }
    busy.value = null
    error.value = null
  }

  /** Every problem goes to "confirm" first, however it was captured: the AI can misread handwriting. */
  function takeProblem(next: AnyProblem, from: ProblemSource, text = '', how: 'high' | 'low' = 'high') {
    problem.value = next
    source.value = from
    problemText.value = text
    confidence.value = how
    state.value = 'confirm'
    error.value = null
  }

  /** A typed problem (two numbers and + or -). Returns a message if it can't be used. */
  function enterTyped(next: AnyProblem): string | null {
    if (state.value !== 'capture') return null
    const message = problemError(next)
    if (message) {
      error.value = message
      return message
    }
    takeProblem(next, 'typed')
    return null
  }

  /** A photo (already resized) or a typed word problem, read by the tutor. Returns true if it was read. */
  async function readProblem(body: ReadBody): Promise<boolean> {
    if (state.value !== 'capture' || busy.value) return false
    busy.value = 'reading'
    error.value = null
    const reply = await api.read(body)
    busy.value = null
    if (!reply.ok) {
      error.value = reply.message
      return false
    }
    takeProblem(reply.problem, 'imageBase64' in body ? 'photo' : 'text', reply.problemText, reply.confidence)
    return true
  }

  /** "Yes, this is my problem." */
  function confirmProblem(): boolean {
    if (state.value !== 'confirm' || !problem.value) return false
    state.value = 'attempt'
    return true
  }

  /** "Fix it": she changes the numbers. She is asked to confirm again. */
  function editProblem(next: AnyProblem): string | null {
    if (state.value !== 'confirm') return null
    const message = problemError(next)
    if (message) {
      error.value = message
      return message
    }
    problem.value = next
    confidence.value = 'high'
    error.value = null
    return null
  }

  /** Asks the tutor for one hint, or builds one in the browser if it can't be reached. */
  async function giveHint(level: 1 | 2 | 3, stuck: boolean) {
    const current = problem.value
    if (!current) return
    const studentAnswer = lastWrongAnswer.value || undefined
    busy.value = 'hint'
    const reply = await api.hint({ problem: current, studentAnswer, stuck, level })
    busy.value = null
    if (reply.ok && reply.hint) {
      hints.value.push(reply.hint)
    } else {
      hints.value.push(localHint(current, studentAnswer, stuck, level))
      hintsOffline.value = true
    }
  }

  /** Wrong answer or "I'm stuck": on to the next hint, and after hint 3 to teaching. */
  async function advanceHelp(stuck: boolean) {
    const from = state.value
    if (!(from in NEXT_HELP)) return
    const to = NEXT_HELP[from as keyof typeof NEXT_HELP]
    state.value = to
    if (to === 'teach') {
      reachedTeach.value = true
      return
    }
    await giveHint(levelOf(to), stuck)
  }

  /**
   * Her answer. The engine decides: right goes to the check, equal but not simplest stays put,
   * and wrong (or stuck) moves up the hint ladder.
   */
  async function submitAnswer(text: string): Promise<AnswerStatus | null> {
    const current = problem.value
    if (!current || !canAnswer.value || text.trim() === '') return null

    attempts.value += 1
    lastAnswer.value = text.trim()
    notSimplest.value = false
    wrongMessage.value = ''

    const result = checkAnswer(answerOf(current), text)
    if (result.status === 'correct') {
      acceptedAnswer.value = text.trim()
      state.value = 'check'
      return 'correct'
    }
    if (result.status === 'correctNotSimplest') {
      notSimplest.value = true
      return 'correctNotSimplest'
    }

    lastWrongAnswer.value = text.trim()
    const diagnosis = diagnose(current, text)
    if (diagnosis.slip !== 'none' && (diagnosis.slip !== 'unknown' || slip.value === null)) slip.value = diagnosis.slip
    wrongMessage.value = lastWrongMessage.value = pickDifferent(WRONG_MESSAGES, lastWrongMessage.value)
    await advanceHelp(false)
    return 'wrong'
  }

  /** "I'm stuck": the next hint, with no answer needed. */
  async function imStuck(): Promise<boolean> {
    if (!canBeStuck.value) return false
    wrongMessage.value = ''
    notSimplest.value = false
    await advanceHelp(true)
    return true
  }

  // --- The check (required): add back, or estimate ---

  function chooseCheck(method: CheckMethod): boolean {
    if (state.value !== 'check' || checkDone.value) return false
    chosenCheck.value = method
    return true
  }

  function finishCheck(method: CheckMethod) {
    checkMethod.value = method
    checkDone.value = true
  }

  /**
   * Her add-back (the shared proof step). One wrong try gets a hint and encouragement,
   * two show the worked add-back. The check is done once she has it or has seen it worked.
   */
  function submitAddBack(text: string): AnswerStatus | null {
    const current = problem.value
    if (!current || state.value !== 'check' || chosenCheck.value !== 'addBack' || addBack.value.done) return null
    if (text.trim() === '') return null

    const inverse = inverseProblem(current)
    const result = checkAnswer(answerOf(inverse), text)
    addBack.value.result = result.status

    if (result.status === 'correct') {
      addBack.value.done = true
      finishCheck('addBack')
    } else if (result.status === 'wrong') {
      addBack.value.wrong += 1
      addBack.value.helped = true
      if (addBack.value.wrong >= WRONG_ADD_BACKS_BEFORE_STEPS) {
        addBack.value.steps = stepsOf(inverse)
        addBack.value.done = true
        finishCheck('addBack')
      } else {
        addBack.value.encouragement = lastEncouragement.value = pickDifferent(PROOF_SLIP_MESSAGES, lastEncouragement.value)
        addBack.value.hint = proofHint(current.op, formatMixed(inverse.b))
      }
    }
    return result.status
  }

  /** Estimate, step 1: she rounds each number to the nearest half or whole. */
  function submitRounding(textA: string, textB: string): { a: boolean; b: boolean } | null {
    const info = estimateInfo.value
    if (!info || state.value !== 'check' || chosenCheck.value !== 'estimate' || estimate.value.stage !== 'round') return null

    const matches = (text: string, target: Operand) => {
      const parsed = parseMixed(text)
      return parsed !== null && equals(toImproper(parsed), target)
    }
    const ok = { a: matches(textA, info.roundedA), b: matches(textB, info.roundedB) }
    estimate.value.roundOk = ok
    if (ok.a && ok.b) {
      estimate.value.stage = 'compare'
    } else {
      estimate.value.wrongRounds += 1
      if (estimate.value.wrongRounds >= WRONG_ROUNDS_BEFORE_REVEAL) {
        estimate.value.revealed = true
        estimate.value.stage = 'compare'
      }
    }
    return ok
  }

  /** Estimate, step 2: is her answer close to the estimate? The engine knows. */
  function answerClose(saysClose: boolean): boolean | null {
    const info = estimateInfo.value
    if (!info || state.value !== 'check' || chosenCheck.value !== 'estimate' || estimate.value.stage !== 'compare') return null
    if (checkDone.value) return null

    if (saysClose === info.close) {
      estimate.value.closeMessage = ''
      finishCheck('estimate')
      return true
    }
    estimate.value.wrongClose += 1
    estimate.value.closeMessage = 'Look again. Is it within half a whole of the estimate?'
    if (estimate.value.wrongClose >= WRONG_CLOSE_BEFORE_REVEAL) finishCheck('estimate')
    return false
  }

  /** On to the explanation. Only once the check is done: it can't be skipped. */
  function continueFromCheck(): boolean {
    if (state.value !== 'check' || !checkDone.value) return false
    state.value = 'explain'
    return true
  }

  // --- Explain-back ---

  /**
   * Her explanation, sent to the tutor for feedback on her reasoning (the engine already checked the number).
   * A follow-up question gets one extra try, then we move on.
   */
  async function submitExplanation(text: string): Promise<boolean> {
    const current = problem.value
    if (!current || state.value !== 'explain' || !checkDone.value || busy.value || text.trim() === '') return false

    busy.value = 'explain'
    error.value = null
    const reply: ExplainReply = await api.explain({ problem: current, explanation: text.trim().slice(0, 500) })
    busy.value = null
    if (!reply.ok) {
      error.value = reply.message
      return false
    }

    explanation.value.tries += 1
    explanation.value.text = text.trim()
    explanation.value.verdict = reply.verdict
    explanation.value.praise = reply.praise
    explanation.value.followUp = reply.verdict === 'clear' ? '' : (reply.followUp ?? '')
    if (reply.verdict === 'clear' || !reply.followUp || explanation.value.tries >= MAX_EXPLANATION_TRIES) {
      state.value = 'done'
    }
    return true
  }

  /** She can move on after a follow-up question, or when the tutor can't be reached. */
  const canSkipExplanation = computed(
    () => state.value === 'explain' && checkDone.value && (error.value !== null || explanation.value.followUp !== ''),
  )

  function skipExplanation(): boolean {
    if (!canSkipExplanation.value) return false
    state.value = 'done'
    return true
  }

  return {
    state,
    source,
    problem,
    problemText,
    confidence,
    attempts,
    lastAnswer,
    lastWrongAnswer,
    acceptedAnswer,
    notSimplest,
    wrongMessage,
    hints,
    hintsOffline,
    slip,
    reachedTeach,
    chosenCheck,
    checkMethod,
    checkDone,
    addBack,
    estimate,
    explanation,
    busy,
    error,
    hintsUsed,
    expected,
    canAnswer,
    canBeStuck,
    estimateInfo,
    estimateAvailable,
    addBackProof,
    canSkipExplanation,
    setApi,
    reset,
    enterTyped,
    readProblem,
    confirmProblem,
    editProblem,
    submitAnswer,
    imStuck,
    chooseCheck,
    submitAddBack,
    submitRounding,
    answerClose,
    continueFromCheck,
    submitExplanation,
    skipExplanation,
  }
})
