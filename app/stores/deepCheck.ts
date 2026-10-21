import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AsnAnswer, Item } from '../data/deepCheck'
import {
  attemptText,
  challengeAttemptText,
  challengeOf,
  gradeChallenge,
  groupOf,
  buildChapterQuiz,
  gradeAsn,
  gradeBars,
  gradeChoice,
  gradeReverse,
  itemsFor,
  ruleOf,
  type BarState,
  type ChallengeGrade,
  type Grade,
} from '../utils/deepCheck'
import { useSyncStore } from './sync'

export type DeepCheckView = 'home' | 'learn' | 'quiz' | 'done' | 'challenge'

export interface Feedback {
  correct: boolean
  /** A short extra note for a wrong answer (like "6/8 is not equal to 3/4"). */
  message: string
  explanation: string
}

/**
 * The Deep Check screens: rules, Learn mode, a quiz, and the result. Code grades every answer.
 * Each question gets one try; then she sees why, right or wrong. Each answer is saved like any other attempt.
 */
export const useDeepCheckStore = defineStore('deepCheck', () => {
  const view = ref<DeepCheckView>('home')
  /** 'chapter' for the mixed quiz, otherwise a rule id like 'R2'. */
  const scope = ref<string>('')
  /** Which group of rules the mixed quiz is about. */
  const groupId = ref<string>('addsub')
  const items = ref<Item[]>([])
  const index = ref(0)
  const results = ref<{ id: string; correct: boolean }[]>([])
  const feedback = ref<Feedback | null>(null)
  /** The challenge being played, how it was graded last, and how many readable tries she has made. */
  const challengeId = ref<string>('')
  const challengeResult = ref<ChallengeGrade | null>(null)
  const challengeTries = ref(0)

  const current = computed<Item | null>(() => items.value[index.value] ?? null)
  const total = computed(() => items.value.length)
  const score = computed(() => results.value.filter((r) => r.correct).length)
  const isLast = computed(() => index.value >= items.value.length - 1)
  const answered = computed(() => feedback.value !== null)
  const challenge = computed(() => challengeOf(challengeId.value))
  const group = computed(() => groupOf(groupId.value))
  const rule = computed(() => (scope.value && scope.value !== 'chapter' ? ruleOf(scope.value) : undefined))

  function goHome() {
    view.value = 'home'
    scope.value = ''
    items.value = []
    results.value = []
    feedback.value = null
    index.value = 0
    challengeId.value = ''
    challengeResult.value = null
    challengeTries.value = 0
  }

  function openLearn(ruleId: string) {
    if (!ruleOf(ruleId)) return
    scope.value = ruleId
    view.value = 'learn'
  }

  function begin(list: Item[], newScope: string) {
    scope.value = newScope
    items.value = list
    index.value = 0
    results.value = []
    feedback.value = null
    view.value = 'quiz'
  }

  /** Five questions about one rule, one of each type. */
  function startRule(ruleId: string) {
    if (!ruleOf(ruleId)) return
    begin(itemsFor(ruleId), ruleId)
  }

  /** Ten questions across the rules of one group, to check understanding before a chapter test. */
  function startChapter(group: string = 'addsub', rng: () => number = Math.random) {
    const list = buildChapterQuiz(group, rng)
    if (list.length === 0) return
    groupId.value = group
    begin(list, 'chapter')
  }

  /** Records the grade, shows why, and saves the attempt. A grade that could not be read is not counted. */
  function settle(grade: Grade): Grade {
    const item = current.value
    if (!item || feedback.value || grade.status === 'invalid') return grade
    const correct = grade.status === 'correct'
    results.value.push({ id: item.id, correct })
    feedback.value = {
      correct,
      message: grade.status === 'wrong' ? (grade.message ?? '') : '',
      explanation: item.explanation,
    }
    void useSyncStore().record({
      mode: 'deep_check',
      problem: attemptText(item),
      correct,
      firstTry: correct,
      hintsUsed: 0,
      errorType: null,
    })
    return grade
  }

  function answerAsn(answer: AsnAnswer): Grade {
    const item = current.value
    return item?.type === 'asn' ? settle(gradeAsn(item, answer)) : { status: 'invalid', message: 'Not this kind of question.' }
  }

  function answerChoice(choice: number): Grade {
    const item = current.value
    return item && (item.type === 'spotMistake' || item.type === 'oddOneOut')
      ? settle(gradeChoice(item, choice))
      : { status: 'invalid', message: 'Not this kind of question.' }
  }

  function answerReverse(text: string): Grade {
    const item = current.value
    return item?.type === 'reverse' ? settle(gradeReverse(item.check, text)) : { status: 'invalid', message: 'Not this kind of question.' }
  }

  function answerDraw(state: BarState): Grade {
    const item = current.value
    return item?.type === 'draw' ? settle(gradeBars(item.target, state)) : { status: 'invalid', message: 'Not this kind of question.' }
  }

  function openChallenge(id: string) {
    if (!challengeOf(id)) return
    challengeId.value = id
    challengeResult.value = null
    challengeTries.value = 0
    view.value = 'challenge'
  }

  /**
   * Grades a challenge. An answer that cannot be read is not counted (she can fix it). A readable one is saved,
   * right or wrong, and she can try again until she solves it.
   */
  function submitChallenge(values: Record<string, string | number | null | undefined>, hintsUsed = 0): ChallengeGrade | null {
    const ch = challenge.value
    if (!ch) return null
    const grade = gradeChallenge(ch, values)
    challengeResult.value = grade
    if (!grade.readable) return grade
    const first = challengeTries.value === 0
    challengeTries.value += 1
    void useSyncStore().record({
      mode: 'deep_check',
      problem: challengeAttemptText(ch),
      correct: grade.correct,
      firstTry: first && grade.correct,
      hintsUsed: Math.min(hintsUsed, 10),
      errorType: null,
    })
    return grade
  }

  function tryAgain() {
    challengeResult.value = null
  }

  /** Next question, or the result after the last one. Only after she has answered. */
  function next() {
    if (!feedback.value) return
    feedback.value = null
    if (isLast.value) {
      view.value = 'done'
    } else {
      index.value += 1
    }
  }

  return {
    view, scope, groupId, group, challenge, challengeResult, challengeTries, items, index, results, feedback, current, total, score, isLast, answered, rule,
    goHome, openLearn, openChallenge, submitChallenge, tryAgain, startRule, startChapter, answerAsn, answerChoice, answerReverse, answerDraw, next,
  }
})
