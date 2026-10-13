<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTutorStore } from '../../stores/tutor'
import { boxesToText, isAnswerEmpty, isFractionIncomplete, type AnswerBoxes } from '../../utils/answer'
import { formatMixed, opSymbol, type MixedNumber } from '../../utils/fraction'

const store = useTutorStore()

/** The rounded versions she types, one per number. */
const rounding = ref<AnswerBoxes[]>([
  { whole: '', num: '', den: '' },
  { whole: '', num: '', den: '' },
])
const message = ref('')

const info = computed(() => store.estimateInfo)
const problem = computed(() => store.problem)
const symbol = computed(() => (problem.value ? opSymbol(problem.value.op) : ''))
const numbers = computed(() => (problem.value ? [problem.value.a as MixedNumber, problem.value.b as MixedNumber] : []))

function text(m: MixedNumber): string {
  return formatMixed({ numerator: m.whole * m.den + m.num, denominator: m.den })
}

function checkRounding() {
  const boxes = rounding.value
  if (boxes.some(isAnswerEmpty) || boxes.some(isFractionIncomplete)) {
    message.value = 'Fill in both boxes.'
    return
  }
  message.value = ''
  store.submitRounding(boxesToText(boxes[0]!), boxesToText(boxes[1]!))
}

const rowLabel = ['First number', 'Second number']
const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-xl font-bold'
</script>

<template>
  <section v-if="info" class="space-y-5 rounded-2xl border-2 border-emerald-700 bg-emerald-100 p-5">
    <h2 class="text-2xl font-bold text-emerald-950">Estimate to check</h2>

    <!-- Step 1: round each number -->
    <form v-if="store.estimate.stage === 'round'" class="space-y-5" @submit.prevent="checkRounding">
      <p class="text-xl text-slate-900">Round each number to the nearest half or whole.</p>
      <div v-for="(n, i) in numbers" :key="i" class="space-y-2">
        <p class="text-xl font-semibold text-slate-900">
          {{ rowLabel[i] }}: <span class="font-bold">{{ text(n) }}</span>
        </p>
        <PracticeMixedNumberInput v-model="rounding[i]!" @submit="checkRounding" />
      </div>
      <p v-if="message" class="text-xl font-semibold text-red-800" role="alert">{{ message }}</p>
      <div role="status" aria-live="polite">
        <p v-if="store.estimate.roundOk && !(store.estimate.roundOk.a && store.estimate.roundOk.b)" class="text-xl font-semibold">
          Look again at the
          {{ !store.estimate.roundOk.a && !store.estimate.roundOk.b ? 'two numbers' : !store.estimate.roundOk.a ? 'first number' : 'second number' }}.
          Is it closer to a half or a whole?
        </p>
      </div>
      <button type="submit" :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800']">
        Check my rounding
      </button>
    </form>

    <!-- Step 2: is the answer close? -->
    <div v-else class="space-y-4">
      <p v-if="store.estimate.revealed" class="text-xl text-slate-900">Here is the rounding.</p>
      <p class="rounded-xl bg-white p-3 text-3xl font-bold text-slate-900">
        {{ formatMixed(info.roundedA) }} {{ symbol }} {{ formatMixed(info.roundedB) }} is about {{ formatMixed(info.estimate) }}
      </p>
      <p class="text-2xl text-slate-900">
        Your answer is <span class="font-bold">{{ store.acceptedAnswer }}</span>. Is it close?
      </p>
      <div v-if="!store.checkDone" class="flex flex-wrap gap-3">
        <button type="button" :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800']" @click="store.answerClose(true)">
          Yes, it is close
        </button>
        <button
          type="button"
          :class="[button, 'bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100']"
          @click="store.answerClose(false)"
        >
          No, it is not close
        </button>
      </div>
      <div role="status" aria-live="polite">
        <p v-if="store.estimate.closeMessage" class="text-xl font-semibold">{{ store.estimate.closeMessage }}</p>
        <p v-if="store.checkDone" class="text-2xl font-bold text-emerald-950">
          Yes. It is within half a whole of the estimate.
        </p>
      </div>
    </div>
  </section>
</template>
