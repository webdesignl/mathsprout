<script setup lang="ts">
import { ref, watch } from 'vue'
import type { MixedNumber, Op, Problem } from '../../utils/fraction'
import type { AnswerBoxes } from '../../utils/answer'

const props = defineProps<{
  /** Fill the boxes with a problem already read (for "Fix it"). */
  initial?: Problem | null
  submitLabel: string
  /** A short message from outside, for example "Put the bigger number first". */
  error?: string | null
}>()
const emit = defineEmits<{ submit: [problem: Problem] }>()

const op = ref<Op>('add')
const first = ref<AnswerBoxes>({ whole: '', num: '', den: '' })
const second = ref<AnswerBoxes>({ whole: '', num: '', den: '' })
const message = ref('')

function toBoxes(m: MixedNumber): AnswerBoxes {
  return {
    whole: m.whole === 0 && m.num > 0 ? '' : String(m.whole),
    num: m.num > 0 ? String(m.num) : '',
    den: m.num > 0 ? String(m.den) : '',
  }
}

watch(
  () => props.initial,
  (problem) => {
    if (!problem) return
    op.value = problem.op
    first.value = toBoxes(problem.a as MixedNumber)
    second.value = toBoxes(problem.b as MixedNumber)
  },
  { immediate: true },
)

/** The three boxes become a mixed number. Returns null (with a message) if they don't make sense. */
function toMixed(boxes: AnswerBoxes, name: string): MixedNumber | null {
  const whole = boxes.whole.trim()
  const num = boxes.num.trim()
  const den = boxes.den.trim()
  if (!whole && !num && !den) {
    message.value = `Fill in the ${name} number.`
    return null
  }
  if ((num && !den) || (!num && den)) {
    message.value = `Fill in the top and the bottom of the ${name} number.`
    return null
  }
  if (den && Number(den) === 0) {
    message.value = 'The bottom number can not be zero.'
    return null
  }
  return { whole: whole ? Number(whole) : 0, num: num ? Number(num) : 0, den: den ? Number(den) : 1 }
}

function go() {
  message.value = ''
  const a = toMixed(first.value, 'first')
  const b = a ? toMixed(second.value, 'second') : null
  if (a && b) emit('submit', { op: op.value, a, b })
}

const symbolButton = 'inline-flex size-16 items-center justify-center rounded-xl text-4xl font-bold'
</script>

<template>
  <form class="space-y-6" @submit.prevent="go">
    <PracticeMixedNumberInput v-model="first" @submit="go" />

    <div class="flex justify-center gap-3" role="group" aria-label="Add or subtract">
      <button
        type="button"
        :aria-pressed="op === 'add'"
        aria-label="Add"
        :class="[symbolButton, op === 'add' ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-900 ring-2 ring-emerald-700']"
        @click="op = 'add'"
      >
        +
      </button>
      <button
        type="button"
        :aria-pressed="op === 'subtract'"
        aria-label="Subtract"
        :class="[symbolButton, op === 'subtract' ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-900 ring-2 ring-emerald-700']"
        @click="op = 'subtract'"
      >
        −
      </button>
    </div>

    <PracticeMixedNumberInput v-model="second" @submit="go" />

    <p v-if="message || error" class="text-center text-xl font-semibold text-red-800" role="alert">
      {{ message || error }}
    </p>
    <div class="flex justify-center">
      <button
        type="submit"
        class="inline-flex min-h-16 items-center justify-center rounded-xl bg-emerald-700 px-10 text-2xl font-bold text-white hover:bg-emerald-800"
      >
        {{ submitLabel }}
      </button>
    </div>
  </form>
</template>
