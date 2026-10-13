<script setup lang="ts">
import { ref, watch } from 'vue'
import { opSymbol, type AnyOp, type AnyProblem, type MixedNumber } from '../../utils/fraction'
import { mixedToBoxes, type AnswerBoxes } from '../../utils/answer'

const props = defineProps<{
  /** Fill the boxes with a problem already read (for "Fix it"). */
  initial?: AnyProblem | null
  submitLabel: string
  /** A short message from outside, for example "Put the bigger number first". */
  error?: string | null
}>()
const emit = defineEmits<{ submit: [problem: AnyProblem] }>()

const op = ref<AnyOp>('add')
const OPERATIONS: Array<{ op: AnyOp; label: string }> = [
  { op: 'add', label: 'Add' },
  { op: 'subtract', label: 'Subtract' },
  { op: 'multiply', label: 'Multiply' },
  { op: 'divide', label: 'Divide' },
]
const first = ref<AnswerBoxes>({ whole: '', num: '', den: '' })
const second = ref<AnswerBoxes>({ whole: '', num: '', den: '' })
const message = ref('')

watch(
  () => props.initial,
  (problem) => {
    if (!problem) return
    op.value = problem.op
    first.value = mixedToBoxes(problem.a as MixedNumber)
    second.value = mixedToBoxes(problem.b as MixedNumber)
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

    <div class="flex justify-center gap-3" role="group" aria-label="Operation">
      <button
        v-for="choice in OPERATIONS"
        :key="choice.op"
        type="button"
        :aria-pressed="op === choice.op"
        :aria-label="choice.label"
        :class="[symbolButton, op === choice.op ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-900 ring-2 ring-emerald-700']"
        @click="op = choice.op"
      >
        {{ opSymbol(choice.op) }}
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
