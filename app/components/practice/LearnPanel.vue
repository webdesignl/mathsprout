<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PracticeProblem } from '../../utils/stories'
import { buildLearn } from '../../utils/learn'

const props = withDefaults(defineProps<{ problem: PracticeProblem
    answer: string
    /** The problem in words, for problems that have no story of their own (for example one she photographed). */
    question?: string
    showTryLike?: boolean
    showBack?: boolean
  }>(), {
  showTryLike: true,
  showBack: true,
})
const emit = defineEmits<{ close: []; tryLike: [] }>()

const learn = computed(() => buildLearn(props.problem, props.answer))
/** How many steps are showing. She taps Next to see more. */
const shown = ref(1)
const atEnd = computed(() => shown.value >= learn.value.steps.length)

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-xl font-bold'
</script>

<template>
  <section class="space-y-5 rounded-2xl border-2 border-indigo-700 bg-indigo-50 p-5">
    <h2 class="text-2xl font-bold text-indigo-950">Let’s walk through it</h2>

    <!-- 1. The question, so she knows what the problem is. -->
    <div class="space-y-3">
      <h3 class="text-xl font-bold text-slate-900">The problem</h3>
      <p v-if="question && !problem.story" class="rounded-2xl bg-white p-5 text-2xl leading-snug text-slate-900">{{ question }}</p>
      <PracticeProblemCard :problem="problem" :show-numbers="true" />
    </div>

    <!-- 2. Why this operation. -->
    <div class="rounded-xl border-2 border-indigo-700 bg-white p-4">
      <h3 class="text-xl font-bold text-slate-900">Which operation, and why?</h3>
      <p class="text-xl text-slate-900">{{ learn.why }}</p>
    </div>

    <!-- 3. Her answer next to the correct one. -->
    <div v-if="learn.comparison" class="grid gap-3 sm:grid-cols-2" aria-label="Your answer and the correct answer">
      <div class="rounded-xl bg-amber-100 p-4">
        <p class="text-lg font-semibold text-amber-950">
          {{ learn.comparison.kind === 'wrong' ? 'Your answer' : 'Your answer (not finished yet)' }}
        </p>
        <p class="text-3xl font-bold text-amber-950">{{ learn.comparison.yours }}</p>
      </div>
      <div class="rounded-xl bg-emerald-100 p-4">
        <p class="text-lg font-semibold text-emerald-950">
          {{ learn.comparison.kind === 'wrong' ? 'The correct answer' : 'In simplest form' }}
        </p>
        <p class="text-3xl font-bold text-emerald-950">{{ learn.comparison.correct }}</p>
      </div>
    </div>

    <!-- 4. How to do it, one step at a time. -->
    <h3 class="text-xl font-bold text-slate-900">How to do it</h3>
    <p v-if="learn.intro" class="text-xl text-slate-900">{{ learn.intro }}</p>

    <ol class="space-y-3" aria-live="polite">
      <li
        v-for="(item, i) in learn.steps.slice(0, shown)"
        :key="i"
        :class="[
          'rounded-xl p-3 text-xl text-slate-900',
          item.highlighted ? 'border-4 border-amber-600 bg-amber-100' : 'bg-white',
        ]"
      >
        <span class="font-semibold">Step {{ i + 1 }}.</span> {{ item.step.description }}
        <span class="mt-1 block text-2xl font-bold">{{ item.step.expression }}</span>
        <span v-if="item.note" class="mt-2 block font-semibold text-amber-950">{{ item.note }}</span>
      </li>
    </ol>

    <div class="flex flex-wrap gap-3">
      <button
        v-if="!atEnd"
        type="button"
        :class="[button, 'bg-indigo-700 text-white hover:bg-indigo-800']"
        @click="shown += 1"
      >
        Next
      </button>
      <button
        v-else-if="showTryLike"
        type="button"
        :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800']"
        @click="emit('tryLike')"
      >
        Try one like it
      </button>
      <button
        v-if="showBack"
        type="button"
        :class="[button, 'bg-white text-indigo-900 ring-2 ring-indigo-700 hover:bg-indigo-100']"
        @click="emit('close')"
      >
        Back
      </button>
    </div>
  </section>
</template>
