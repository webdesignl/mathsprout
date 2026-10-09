<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Feedback } from '../../stores/practice'

const props = defineProps<{ feedback: Feedback | null; isLast: boolean }>()
const emit = defineEmits<{ hint: []; showSteps: []; next: [] }>()

/** The student confirms the add-back check before moving on. */
const proved = ref(false)
watch(
  () => props.feedback?.kind,
  () => {
    proved.value = false
  },
)

const button =
  'inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-xl font-bold'
</script>

<template>
  <!-- The live region is always on the page so screen readers announce new feedback. -->
  <div role="status" aria-live="polite" class="min-h-24">
    <section
      v-if="feedback?.kind === 'correct'"
      class="space-y-4 rounded-2xl border-2 border-emerald-700 bg-emerald-100 p-5"
    >
      <p class="celebrate text-3xl font-bold text-emerald-900">
        <span aria-hidden="true">🎉</span> Correct! Great job!
      </p>
      <div class="space-y-2">
        <h2 class="text-xl font-bold text-slate-900">Check step: prove it by adding back</h2>
        <p class="rounded-xl bg-white p-3 text-2xl font-bold text-slate-900">
          {{ feedback.verify.expression }}
        </p>
        <button
          v-if="!proved"
          type="button"
          :class="[button, 'bg-white text-emerald-900 ring-2 ring-emerald-700 hover:bg-emerald-50']"
          @click="proved = true"
        >
          Yes, it matches!
        </button>
        <p v-else class="text-xl font-semibold text-emerald-900">Nice checking!</p>
      </div>
      <button
        type="button"
        :disabled="!proved"
        :class="[
          button,
          'bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700',
        ]"
        @click="emit('next')"
      >
        {{ isLast ? 'See my results' : 'Next problem' }}
      </button>
    </section>

    <section
      v-else-if="feedback?.kind === 'notSimplest'"
      class="rounded-2xl border-2 border-amber-700 bg-amber-100 p-5"
    >
      <p class="text-2xl font-bold text-amber-950">
        Equal, but can you write it in simplest form?
      </p>
      <p class="mt-1 text-xl text-amber-950">
        Is the fraction smaller than 1 whole, and can the top and bottom be divided by the same number?
      </p>
    </section>

    <section
      v-else-if="feedback?.kind === 'wrong'"
      class="space-y-4 rounded-2xl border-2 border-indigo-700 bg-indigo-50 p-5"
    >
      <p class="text-2xl font-bold text-indigo-950">Not quite yet. Let’s think about it.</p>
      <ul class="space-y-2">
        <li v-for="(hint, i) in feedback.hints" :key="i" class="text-xl text-slate-900">
          {{ hint }}
        </li>
      </ul>
      <div class="flex flex-wrap gap-3">
        <button
          v-if="feedback.moreHints"
          type="button"
          :class="[button, 'bg-white text-indigo-900 ring-2 ring-indigo-700 hover:bg-indigo-100']"
          @click="emit('hint')"
        >
          Give me another hint
        </button>
        <button
          v-if="feedback.canShowSteps && feedback.moreSteps"
          type="button"
          :class="[button, 'bg-indigo-700 text-white hover:bg-indigo-800']"
          @click="emit('showSteps')"
        >
          {{ feedback.steps.length === 0 ? 'Show me the steps' : 'Show the next step' }}
        </button>
      </div>
      <ol v-if="feedback.steps.length" class="list-decimal space-y-3 pl-6">
        <li v-for="(step, i) in feedback.steps" :key="i" class="text-xl text-slate-900">
          {{ step.description }}
          <span class="mt-1 block rounded-lg bg-white px-3 py-2 text-2xl font-bold">
            {{ step.expression }}
          </span>
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .celebrate {
    animation: pop 0.6s ease-out 1;
  }
}
@keyframes pop {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  60% {
    transform: scale(1.08);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}
</style>
