<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { usePracticeStore, SET_SIZE } from '../stores/practice'
import {
  boxesToText,
  isAnswerEmpty,
  isFractionIncomplete,
  type AnswerBoxes,
} from '../utils/answer'
import type { Problem } from '../utils/fraction'
import type { ProblemOp } from '../utils/problems'

useHead({ title: 'Practice · MathSprout' })

const store = usePracticeStore()

const choices: Array<{ value: ProblemOp; label: string }> = [
  { value: 'add', label: 'Add' },
  { value: 'subtract', label: 'Subtract' },
  { value: 'mixed', label: 'Mixed' },
]
const op = ref<ProblemOp>('add')
const needsRegroup = ref(false)
const stories = ref(true)

const emptyAnswer = (): AnswerBoxes => ({ whole: '', num: '', den: '' })
const answer = ref<AnswerBoxes>(emptyAnswer())
const message = ref('')
const input = ref<{ focus: () => void } | null>(null)
const nextButton = ref<HTMLButtonElement | null>(null)

/** The problem and answer shown in the Learn panel, or null when it is closed. */
const learnTarget = ref<{ problem: Problem; answer: string } | null>(null)

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-xl font-bold'

async function focusInput() {
  await nextTick()
  input.value?.focus()
}

// A new problem (next, retry, or "try one like it") starts with empty boxes.
watch(
  () => store.current,
  () => {
    answer.value = emptyAnswer()
    message.value = ''
    learnTarget.value = null
    focusInput()
  },
)

// Once the proof is done, keyboard focus moves to "Next".
watch(
  () => store.canAdvance,
  async (ready) => {
    if (!ready) return
    await nextTick()
    nextButton.value?.focus()
  },
)

function begin() {
  store.start({ op: op.value, needsRegroup: needsRegroup.value, stories: stories.value })
  focusInput()
}

function check() {
  if (store.isSolved) return
  if (isAnswerEmpty(answer.value)) {
    message.value = 'Type your answer in the boxes first.'
    return
  }
  if (isFractionIncomplete(answer.value)) {
    message.value = 'Fill in the top and the bottom number.'
    return
  }
  message.value = ''
  store.submit(boxesToText(answer.value))
}

function openLearnHere() {
  if (!store.current) return
  store.markLearned()
  learnTarget.value = { problem: store.current, answer: store.currentMissedAnswer }
}

function openLearnFromSummary(i: number) {
  const item = store.summary.items[i]
  if (item) learnTarget.value = { problem: item.problem, answer: store.lastMissed[i] ?? '' }
}

function tryOneLikeIt() {
  const target = learnTarget.value
  if (!target) return
  store.startSimilar(target.problem)
  learnTarget.value = null
}

function leave() {
  if (store.isSimilar) store.endSimilar()
  else store.backToSummary()
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <!-- Choose what to practice -->
    <section v-if="store.view === 'idle'" class="space-y-6">
      <h1 class="text-4xl font-bold text-emerald-900">Practice</h1>

      <fieldset class="space-y-3">
        <legend class="text-2xl font-semibold">What do you want to practice?</legend>
        <div class="flex flex-wrap gap-3">
          <label
            v-for="choice in choices"
            :key="choice.value"
            class="flex min-h-12 cursor-pointer items-center rounded-xl border-2 border-emerald-700 bg-white px-6 text-xl font-bold text-emerald-900 has-checked:bg-emerald-700 has-checked:text-white has-focus-visible:outline-4 has-focus-visible:outline-offset-2 has-focus-visible:outline-indigo-700"
          >
            <input v-model="op" type="radio" name="op" :value="choice.value" class="sr-only" />
            {{ choice.label }}
          </label>
        </div>
      </fieldset>

      <label class="flex min-h-12 cursor-pointer items-center gap-3 text-xl font-semibold">
        <input v-model="needsRegroup" type="checkbox" class="size-7 accent-emerald-700" />
        Tricky regrouping
        <span class="text-lg font-normal text-slate-700">(subtraction where you borrow)</span>
      </label>

      <label class="flex min-h-12 cursor-pointer items-center gap-3 text-xl font-semibold">
        <input v-model="stories" type="checkbox" class="size-7 accent-emerald-700" />
        Story problems
        <span class="text-lg font-normal text-slate-700">(real-life word problems)</span>
      </label>

      <button
        type="button"
        :class="[button, 'min-h-16 bg-emerald-700 px-10 text-2xl text-white hover:bg-emerald-800']"
        @click="begin"
      >
        Start {{ SET_SIZE }} problems
      </button>
    </section>

    <!-- Real-world ideas for extra credit -->
    <PracticeRealWorldUnlock
      v-else-if="store.view === 'unlock'"
      :cards="store.unlockCards"
      :submitted="store.examplesSubmitted"
      @submit="store.submitExamples($event)"
      @skip="store.skipExamples()"
      @continue="store.continueToSummary()"
    />

    <!-- Summary -->
    <template v-else-if="store.view === 'summary'">
      <PracticeLearnPanel
        v-if="learnTarget"
        :key="learnTarget.problem.op + JSON.stringify(learnTarget.problem.a)"
        :problem="learnTarget.problem"
        :answer="learnTarget.answer"
        @close="learnTarget = null"
        @try-like="tryOneLikeIt"
      />
      <PracticeSetSummary
        v-else
        :items="store.summary.items"
        :first-try-count="store.summary.firstTryCount"
        :after-retry-count="store.summary.afterRetryCount"
        :retried-count="store.summary.retriedCount"
        :total="store.total"
        :extra-credit="store.extraCredit"
        :extra-pending="store.extraPending"
        @retry="store.retryProblem($event)"
        @retry-all="store.retryMissed()"
        @learn="openLearnFromSummary($event)"
        @again="store.reset()"
      />
    </template>

    <!-- Working on a problem -->
    <section v-else-if="store.current" class="space-y-6">
      <h1 class="sr-only">Practice</h1>

      <div class="space-y-2">
        <PracticeProgressBar
          v-if="!store.isSimilar && !store.isRetry"
          :current="store.index + 1"
          :total="store.total"
          :score="store.score"
        />
        <p v-else class="text-xl font-semibold text-slate-900">
          {{ store.isSimilar ? 'One like it' : 'Trying it again' }}
        </p>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <PracticeProofStreak :streak="store.proofStreak" :master="store.proofMaster" />
          <button
            v-if="store.isSimilar || store.isRetry"
            type="button"
            class="min-h-12 rounded-xl px-4 text-lg font-semibold text-slate-900 underline underline-offset-4"
            @click="leave"
          >
            {{ store.isSimilar ? 'Back' : 'Back to results' }}
          </button>
        </div>
      </div>

      <PracticeProblemCard :problem="store.current" />

      <PracticeLearnPanel
        v-if="learnTarget"
        :key="learnTarget.problem.op + JSON.stringify(learnTarget.problem.a)"
        :problem="learnTarget.problem"
        :answer="learnTarget.answer"
        @close="learnTarget = null"
        @try-like="tryOneLikeIt"
      />

      <template v-else>
        <form v-if="!store.isSolved" class="space-y-4" @submit.prevent="check">
          <p class="text-center text-xl font-semibold">Write your answer as a mixed number.</p>
          <PracticeMixedNumberInput ref="input" v-model="answer" @submit="check" />
          <p v-if="message" class="text-center text-xl font-semibold text-red-800" role="alert">
            {{ message }}
          </p>
          <div class="flex justify-center">
            <button
              type="submit"
              :class="[button, 'min-h-16 bg-emerald-700 px-10 text-2xl text-white hover:bg-emerald-800']"
            >
              Check my answer
            </button>
          </div>
        </form>

        <PracticeFeedbackPanel
          :feedback="store.feedback"
          @hint="store.nextHint()"
          @show-steps="store.showSteps()"
          @learn="openLearnHere"
        />

        <PracticeWrongCheckPanel
          v-if="store.wrongCheck"
          :key="store.wrongCheck.round"
          :check="store.wrongCheck"
          @submit="store.submitWrongCheck($event)"
        />

        <PracticeProofPanel
          v-if="store.proof"
          :proof="store.proof"
          @submit="store.submitProof($event)"
        />

        <div v-if="store.canAdvance" class="flex justify-center">
          <button
            ref="nextButton"
            type="button"
            :class="[button, 'min-h-16 bg-emerald-700 px-10 text-2xl text-white hover:bg-emerald-800']"
            @click="store.next()"
          >
            {{
              store.isSimilar
                ? 'Done'
                : store.isRetry
                  ? 'Next'
                  : store.index === store.total - 1
                    ? 'See my results'
                    : 'Next problem'
            }}
          </button>
        </div>
      </template>
    </section>
  </div>
</template>
