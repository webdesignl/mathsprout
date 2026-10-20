import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AsnAnswer, Item } from '../data/deepCheck'
import {
  attemptText,
  buildChapterQuiz,
  gradeAsn,
  gradeBars,
  gradeChoice,
  gradeReverse,
  itemsFor,
  ruleOf,
  type BarState,
  type Grade,
} from '../utils/deepCheck'
import { useSyncStore } from './sync'

export type DeepCheckView = 'home' | 'learn' | 'quiz' | 'done'

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
  const items = ref<Item[]>([])
  const index = ref(0)
  const results = ref<{ id: string; correct: boolean }[]>([])
  const feedback = ref<Feedback | null>(null)

  const current = computed<Item | null>(() => items.value[index.value] ?? null)
  const total = computed(() => items.value.length)
  const score = computed(() => results.value.filter((r) => r.correct).length)
  const isLast = computed(() => index.value >= items.value.length - 1)
  const answered = computed(() => feedback.value !== null)
  const rule = computed(() => (scope.value && scope.value !== 'chapter' ? ruleOf(scope.value) : undefined))

  function goHome() {
    view.value = 'home'
    scope.value = ''
    items.value = []
    results.value = []
    feedback.value = null
    index.value = 0
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

  /** Ten questions across all the rules, to check understanding before a chapter test. */
  function startChapter(rng: () => number = Math.random) {
    begin(buildChapterQuiz(rng), 'chapter')
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
    view, scope, items, index, results, feedback, current, total, score, isLast, answered, rule,
    goHome, openLearn, startRule, startChapter, answerAsn, answerChoice, answerReverse, answerDraw, next,
  }
})
