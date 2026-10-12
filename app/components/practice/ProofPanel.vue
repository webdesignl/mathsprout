<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import type { Proof } from '../../stores/practice'
import {
  boxesToText,
  isAnswerEmpty,
  isFractionIncomplete,
  type AnswerBoxes,
} from '../../utils/answer'
import { NOT_SIMPLEST_MESSAGE, WHY_PROVE_IT } from '../../utils/messages'

defineProps<{ proof: Proof; skippable: boolean }>()
const emit = defineEmits<{ submit: [answer: string]; skip: [] }>()

const answer = ref<AnswerBoxes>({ whole: '', num: '', den: '' })
const message = ref('')
const showWhy = ref(false)
const input = ref<{ focus: () => void } | null>(null)

onMounted(async () => {
  await nextTick()
  input.value?.focus()
})

function check() {
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
  <section class="space-y-4 rounded-2xl border-2 border-emerald-700 bg-emerald-100 p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-2xl font-bold text-emerald-950">Prove it!</h2>
      <button
        type="button"
        :aria-expanded="showWhy"
        aria-controls="why-prove-it"
        class="min-h-12 rounded-xl px-4 text-lg font-semibold text-emerald-950 underline underline-offset-4"
        @click="showWhy = !showWhy"
      >
        Why prove it?
      </button>
    </div>

    <p v-if="showWhy" id="why-prove-it" class="rounded-xl bg-white p-3 text-xl text-slate-900">
      {{ WHY_PROVE_IT }}
    </p>

    <p class="rounded-xl bg-white p-3 text-3xl font-bold text-slate-900">{{ proof.equation }}</p>

    <form v-if="!proof.done" class="space-y-4" @submit.prevent="check">
      <PracticeMixedNumberInput ref="input" v-model="answer" @submit="check" />
      <p v-if="message" class="text-center text-xl font-semibold text-red-800" role="alert">
        {{ message }}
      </p>
      <div class="flex flex-wrap justify-center gap-3">
        <button
          type="submit"
          :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800']"
        >
          Check proof
        </button>
        <button
          v-if="skippable"
          type="button"
          :class="[button, 'bg-white text-emerald-900 ring-2 ring-emerald-700 hover:bg-emerald-50']"
          @click="emit('skip')"
        >
          Skip proof
        </button>
      </div>
    </form>

    <div role="status" aria-live="polite">
      <p v-if="proof.result === 'correctNotSimplest' && !proof.done" class="text-xl font-semibold">
        {{ NOT_SIMPLEST_MESSAGE }}
      </p>
      <p v-else-if="proof.result === 'wrong' && proof.hint && !proof.done" class="text-xl font-semibold">
        {{ proof.hint }}
      </p>
      <p v-else-if="proof.done && proof.steps.length === 0" class="text-xl font-semibold text-emerald-950">
        Checks out.
      </p>
      <div v-else-if="proof.done" class="space-y-2">
        <p class="text-xl font-semibold">Here’s the add-back, step by step.</p>
        <ol class="list-decimal space-y-3 pl-6">
          <li v-for="(step, i) in proof.steps" :key="i" class="text-xl text-slate-900">
            {{ step.description }}
            <span class="mt-1 block rounded-lg bg-white px-3 py-2 text-2xl font-bold">
              {{ step.expression }}
            </span>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>
