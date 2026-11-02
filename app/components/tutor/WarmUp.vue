<script setup lang="ts">
import { computed, ref } from 'vue'
import { checkAnswer } from '../../utils/fraction'
import type { BarStage } from '../../utils/fractionBar'

/**
 * An easier version of "how many days until it is all used?": a jar is half used after the same number of days.
 * She answers it, then sees the half-and-half picture. Code checks the answer; it is practice only.
 */
const props = defineProps<{ days: number }>()

const answer = ref('')
const message = ref('')
const solved = ref(false)
const showed = ref(false)
const tries = ref(0)

const expected = computed(() => ({ numerator: props.days * 2, denominator: 1 }))

const stage = computed<BarStage>(() => {
  const used = { start: 0, count: 1, tone: 0, label: `${props.days} days`, result: false, phase: 1 as const }
  const other = { start: 1, count: 1, tone: 1, label: `${props.days} more days`, result: true, phase: 2 as const }
  return {
    step: 0,
    before: { cells: 2, marks: [used] },
    after: { cells: 2, marks: [used, other] },
    whole: 'The whole jar',
    caption: `Half the jar takes ${props.days} days, so the other half takes ${props.days} days too. All of it takes ${props.days * 2} days.`,
  }
})

function check() {
  const text = answer.value.replace(/\D/g, '')
  if (!text) {
    message.value = 'Type a number of days first.'
    return
  }
  if (checkAnswer(expected.value, text).status === 'wrong') {
    tries.value++
    message.value = 'Not yet. The other half of the jar is used up at the same speed. How long does it take?'
    return
  }
  message.value = ''
  solved.value = true
}

const button =
  'inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-lg font-bold bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100'
</script>

<template>
  <div class="space-y-3">
    <p class="text-xl font-semibold text-slate-900">
      A jar of oil is half used up after {{ days }} days, and the same amount is used each day. How many days until the jar is all used up?
    </p>
    <form v-if="!solved && !showed" class="flex flex-wrap items-center gap-3" @submit.prevent="check">
      <label for="warm-up-days" class="sr-only">Number of days</label>
      <input
        id="warm-up-days"
        v-model="answer"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        maxlength="3"
        class="h-14 w-28 rounded-xl border-2 border-slate-700 bg-white text-center text-2xl font-bold text-slate-900"
      />
      <button type="submit" class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-6 text-lg font-bold text-white hover:bg-emerald-800">
        Check
      </button>
      <button v-if="tries >= 2" type="button" :class="button" @click="showed = true">Show me</button>
    </form>
    <p v-if="message" class="text-lg font-semibold text-amber-950" role="status">{{ message }}</p>
    <div v-if="solved || showed" class="space-y-2">
      <p v-if="solved" class="text-xl font-bold text-emerald-900" role="status">Yes! Half takes {{ days }} days, so all of it takes {{ days * 2 }} days.</p>
      <TutorFractionBar :stage="stage" />
      <p class="text-lg font-semibold text-slate-900">Now do the same idea with the real numbers. What part was used?</p>
    </div>
  </div>
</template>
