<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import type { WrongCheck } from '../../stores/practice'
import {
  boxesToText,
  isAnswerEmpty,
  isFractionIncomplete,
  type AnswerBoxes,
} from '../../utils/answer'
import { NOT_SIMPLEST_MESSAGE } from '../../utils/messages'

defineProps<{ check: WrongCheck }>()
const emit = defineEmits<{ submit: [answer: string] }>()

const answer = ref<AnswerBoxes>({ whole: '', num: '', den: '' })
const message = ref('')
const input = ref<{ focus: () => void } | null>(null)

onMounted(async () => {
  await nextTick()
  input.value?.focus()
})

function go() {
  if (isAnswerEmpty(answer.value)) {
    message.value = 'Fill in the boxes first.'
    return
  }
  if (isFractionIncomplete(answer.value)) {
    message.value = 'Fill in the top and bottom.'
    return
  }
  message.value = ''
  emit('submit', boxesToText(answer.value))
}

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-xl font-bold'
</script>

<template>
  <section class="space-y-4 rounded-2xl border-2 border-indigo-700 bg-white p-5">
    <h2 class="text-2xl font-bold text-indigo-950">Add your answer back</h2>
    <p class="rounded-xl bg-indigo-50 p-3 text-3xl font-bold text-slate-900">{{ check.equation }}</p>

    <form v-if="!check.done" class="space-y-4" @submit.prevent="go">
      <PracticeMixedNumberInput ref="input" v-model="answer" @submit="go" />
      <p v-if="message" class="text-center text-xl font-semibold text-red-800" role="alert">
        {{ message }}
      </p>
      <div class="flex justify-center">
        <button type="submit" :class="[button, 'bg-indigo-700 text-white hover:bg-indigo-800']">
          Check
        </button>
      </div>
    </form>

    <div role="status" aria-live="polite" class="space-y-3">
      <p v-if="check.result === 'correctNotSimplest' && !check.done" class="text-xl font-semibold">
        {{ NOT_SIMPLEST_MESSAGE }}
      </p>
      <p v-else-if="check.result === 'wrong' && check.hint && !check.done" class="text-xl font-semibold">
        {{ check.hint }}
      </p>
      <template v-if="check.done">
        <ol v-if="check.steps.length" class="list-decimal space-y-3 pl-6">
          <li v-for="(step, i) in check.steps" :key="i" class="text-xl text-slate-900">
            {{ step.description }}
            <span class="mt-1 block rounded-lg bg-indigo-50 px-3 py-2 text-2xl font-bold">
              {{ step.expression }}
            </span>
          </li>
        </ol>
        <p class="text-2xl font-bold text-indigo-950">{{ check.message }}</p>
        <p class="text-xl text-slate-900">Try your answer again.</p>
      </template>
    </div>
  </section>
</template>
