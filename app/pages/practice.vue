<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { usePracticeStore, SET_SIZE } from '../stores/practice'
import {
  boxesToText,
  isAnswerEmpty,
  isFractionIncomplete,
  type AnswerBoxes,
} from '../utils/answer'
import { describeProblem, type ProblemOp } from '../utils/problems'

useHead({ title: 'Practice · MathSprout' })

const store = usePracticeStore()

const choices: Array<{ value: ProblemOp; label: string }> = [
  { value: 'add', label: 'Add' },
  { value: 'subtract', label: 'Subtract' },
  { value: 'mixed', label: 'Mixed' },
]
const op = ref<ProblemOp>('add')
const needsRegroup = ref(false)

const emptyAnswer = (): AnswerBoxes => ({ whole: '', num: '', den: '' })
const answer = ref<AnswerBoxes>(emptyAnswer())
const message = ref('')
const input = ref<{ focus: () => void } | null>(null)

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-xl font-bold'

async function focusInput() {
  await nextTick()
  input.value?.focus()
}

function begin() {
  store.start({ op: op.value, needsRegroup: needsRegroup.value })
  answer.value = emptyAnswer()
  message.value = ''
  focusInput()
}

function check() {
  if (store.isSolved) return
  if (isAnswerEmpty(answer.value)) {
    message.value = 'Type your answer in the boxes first.'
    return
  }
  if (isFractionIncomplete(answer.value)) {
    message.value = 'Fill in both the top and the bottom number of the fraction.'
    return
  }
  message.value = ''
  store.submit(boxesToText(answer.value))
}

function goNext() {
  if (store.next()) {
    answer.value = emptyAnswer()
    message.value = ''
    focusInput()
  }
}

function playAgain() {
  store.reset()
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <!-- 1. Choose what to practice -->
    <section v-if="store.total === 0" class="space-y-6">
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
        <span class="text-lg font-normal text-slate-700">(subtraction problems where you borrow)</span>
      </label>

      <button type="button" :class="[button, 'min-h-16 bg-emerald-700 px-10 text-2xl text-white hover:bg-emerald-800']" @click="begin">
        Start {{ SET_SIZE }} problems
      </button>
    </section>

    <!-- 3. Summary -->
    <section v-else-if="store.finished" class="space-y-6">
      <h1 class="text-4xl font-bold text-emerald-900">All done!</h1>
      <p class="text-3xl font-semibold">You got {{ store.score }} out of {{ store.total }}.</p>

      <div v-if="store.needsHelp.length" class="space-y-3">
        <h2 class="text-2xl font-bold">Problems that needed some help</h2>
        <ul class="space-y-2">
          <li v-for="item in store.needsHelp" :key="item.number" class="rounded-xl bg-white p-4 text-xl">
            <span class="font-bold">Problem {{ item.number }}:</span> {{ describeProblem(item.problem) }}
            <span class="block text-lg text-slate-700">
              {{ item.wrongAttempts }} wrong {{ item.wrongAttempts === 1 ? 'try' : 'tries' }},
              {{ item.hintsShown }} {{ item.hintsShown === 1 ? 'hint' : 'hints' }}<template v-if="item.stepsShown">,
              steps shown</template>
            </span>
          </li>
        </ul>
      </div>
      <p v-else class="text-2xl text-emerald-900">No hints needed. Wonderful work!</p>

      <button type="button" :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800']" @click="playAgain">
        Practice again
      </button>
    </section>

    <!-- 2. Working through the set -->
    <section v-else-if="store.current" class="space-y-6">
      <h1 class="sr-only">Practice</h1>
      <PracticeProgressBar :current="store.index + 1" :total="store.total" :score="store.score" />
      <PracticeProblemCard :problem="store.current" />

      <form class="space-y-4" @submit.prevent="check">
        <p class="text-center text-xl font-semibold">Write your answer as a mixed number.</p>
        <PracticeMixedNumberInput ref="input" v-model="answer" @submit="check" />
        <p v-if="message" class="text-center text-xl font-semibold text-red-800" role="alert">{{ message }}</p>
        <div class="flex justify-center">
          <button
            type="submit"
            :disabled="store.isSolved"
            :class="[button, 'min-h-16 bg-emerald-700 px-10 text-2xl text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700']"
          >
            Check my answer
          </button>
        </div>
      </form>

      <PracticeFeedbackPanel
        :feedback="store.feedback"
        :is-last="store.index === store.total - 1"
        @hint="store.nextHint()"
        @show-steps="store.showSteps()"
        @next="goNext"
      />
    </section>
  </div>
</template>
