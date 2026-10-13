<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { usePracticeStore, SET_SIZE } from '../stores/practice'
import { useScratchStore } from '../stores/scratch'
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
const scratch = useScratchStore()

/** Rough work is for working on problems, not for choosing a set or reading results. */
const showPad = computed(() => scratch.open && store.view === 'playing' && store.current !== null)

const choices: Array<{ value: ProblemOp; label: string }> = [
  { value: 'add', label: 'Add' },
  { value: 'subtract', label: 'Subtract' },
  { value: 'mixed', label: 'Mixed' },
]
const op = ref<ProblemOp>('add')
const needsRegroup = ref(false)
const stories = ref(true)

/** The answer boxes belong to the problem on screen, so what she typed is kept when she moves around. */
const answer = computed<AnswerBoxes>({
  get: () => store.draft,
  set: (boxes) => store.setDraft(boxes),
})
const confirmingSubmit = ref(false)
const message = ref('')
const input = ref<{ focus: () => void } | null>(null)
const nextButton = ref<HTMLButtonElement | null>(null)
const submitButton = ref<HTMLButtonElement | null>(null)

/** The problem and answer shown in the Learn panel, or null when it is closed. */
const learnTarget = ref<{ problem: Problem; answer: string } | null>(null)

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-xl font-bold'

async function focusInput() {
  await nextTick()
  input.value?.focus()
}

// A different problem (next, back, skip, retry, or "try one like it"): clear messages, focus the boxes.
watch(
  () => store.current,
  () => {
    message.value = ''
    learnTarget.value = null
    confirmingSubmit.value = false
    if (!store.isSolved) focusInput()
  },
)

// Once the proof is done, keyboard focus moves to "Next".
watch(
  () => store.canAdvance,
  async (ready) => {
    if (!ready) return
    await nextTick()
    ;(nextButton.value ?? submitButton.value)?.focus()
  },
)

function begin() {
  scratch.reset()
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

function startOver() {
  scratch.reset()
  store.reset()
}

/** Submit from the last problem. With unanswered problems she is asked to confirm first. */
function submitTest() {
  if (!store.submitTest()) confirmingSubmit.value = store.unansweredCount > 0
}

function leave() {
  if (store.isSimilar) store.endSimilar()
  else store.backToSummary()
}
</script>

<template>
  <div
    :class="[
      'mx-auto',
      showPad ? 'max-w-7xl lg:grid lg:grid-cols-[minmax(0,1fr)_34rem] lg:items-start lg:gap-8' : 'max-w-3xl',
    ]"
  >
    <div :class="['min-w-0 space-y-6', showPad ? 'pb-[60vh] lg:pb-0' : '']">
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
        @again="startOver"
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
            type="button"
            aria-controls="rough-work"
            :aria-expanded="showPad"
            class="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 text-lg font-semibold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100"
            @click="scratch.toggle()"
          >
            <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
              <path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z" stroke-linejoin="round" />
            </svg>
            Rough work
          </button>
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

        <p v-if="store.isSolved && store.solvedAnswer" class="text-center text-xl text-slate-900">
          Your answer: <span class="font-bold">{{ store.solvedAnswer }}</span>
        </p>

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

        <!-- Asked before submitting with unanswered problems; they count as missed. -->
        <section
          v-if="confirmingSubmit && store.unansweredCount > 0"
          role="alert"
          class="space-y-3 rounded-2xl border-2 border-amber-700 bg-amber-100 p-5"
        >
          <p class="text-2xl font-bold text-amber-950">
            You have {{ store.unansweredCount }} unanswered. Submit anyway?
          </p>
          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              :class="[button, 'bg-white text-amber-950 ring-2 ring-amber-700 hover:bg-amber-50']"
              @click="confirmingSubmit = false"
            >
              Keep working
            </button>
            <button
              type="button"
              :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800']"
              @click="store.submitTest(true)"
            >
              Submit anyway
            </button>
          </div>
        </section>

        <div
          v-if="store.canNavigate || store.canAdvance"
          class="flex flex-wrap items-center justify-between gap-3"
        >
          <button
            v-if="store.canGoBack"
            type="button"
            :class="[button, 'bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100']"
            @click="store.back()"
          >
            Back
          </button>
          <div class="ml-auto flex flex-wrap items-center gap-3">
            <button
              v-if="store.canSkip"
              type="button"
              :class="[button, 'bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100']"
              @click="store.skip()"
            >
              Skip
            </button>
            <button
              v-if="store.canAdvance && !store.isLastProblem"
              ref="nextButton"
              type="button"
              :class="[button, 'min-h-16 bg-emerald-700 px-10 text-2xl text-white hover:bg-emerald-800']"
              @click="store.next()"
            >
              {{ store.isSimilar ? 'Done' : store.isRetry ? 'Next' : 'Next problem' }}
            </button>
            <button
              v-if="store.canSubmit"
              ref="submitButton"
              type="button"
              :class="[button, 'min-h-16 bg-emerald-700 px-10 text-2xl text-white hover:bg-emerald-800']"
              @click="submitTest"
            >
              Submit
            </button>
          </div>
        </div>
      </template>
    </section>
    </div>

    <!-- Rough work: beside the problem on wide screens, a bottom sheet on narrow ones. -->
    <aside
      v-if="showPad && store.current"
      id="rough-work"
      aria-label="Rough work"
      class="fixed inset-x-0 bottom-0 z-20 max-h-[60vh] overflow-y-auto rounded-t-2xl border-t-4 border-slate-700 bg-emerald-50 p-4 shadow-2xl lg:sticky lg:top-4 lg:max-h-none lg:self-start lg:overflow-visible lg:rounded-2xl lg:border-4 lg:shadow-md"
    >
      <PracticeScratchPad :page-key="store.scratchKey" @close="scratch.toggle()" />
    </aside>
  </div>
</template>
