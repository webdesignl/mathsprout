<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AnyProblem } from '../../utils/fraction'
import { buildLearn } from '../../utils/learn'

const props = withDefaults(defineProps<{ problem: AnyProblem; answer: string; showTryLike?: boolean; showBack?: boolean }>(), {
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
