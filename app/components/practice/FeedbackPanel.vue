<script setup lang="ts">
import type { Feedback } from '../../stores/practice'

defineProps<{ feedback: Feedback | null }>()
const emit = defineEmits<{ hint: []; showSteps: []; learn: [] }>()

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-xl font-bold'
</script>

<template>
  <!-- The live region is always on the page so screen readers announce new feedback. -->
  <div role="status" aria-live="polite" class="min-h-16">
    <p v-if="feedback?.kind === 'correct'" class="celebrate text-3xl font-bold text-emerald-900">
      <span aria-hidden="true">🎉</span> {{ feedback.message }}
    </p>

    <p
      v-else-if="feedback?.kind === 'notSimplest'"
      class="rounded-2xl border-2 border-amber-700 bg-amber-100 p-4 text-2xl font-bold text-amber-950"
    >
      {{ feedback.message }}
    </p>

    <section
      v-else-if="feedback?.kind === 'wrong'"
      class="space-y-4 rounded-2xl border-2 border-indigo-700 bg-indigo-50 p-5"
    >
      <p class="text-2xl font-bold text-indigo-950">{{ feedback.message }}</p>
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
          Another hint
        </button>
        <button
          v-if="feedback.canShowSteps && feedback.moreSteps"
          type="button"
          :class="[button, 'bg-indigo-700 text-white hover:bg-indigo-800']"
          @click="emit('showSteps')"
        >
          {{ feedback.steps.length === 0 ? 'Show me the steps' : 'Next step' }}
        </button>
        <button
          type="button"
          :class="[button, 'bg-white text-indigo-900 ring-2 ring-indigo-700 hover:bg-indigo-100']"
          @click="emit('learn')"
        >
          Show me what I missed
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
