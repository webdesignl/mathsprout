<script setup lang="ts">
import type { Rule } from '../../data/deepCheck'

defineProps<{ rule: Rule }>()
const emit = defineEmits<{ quiz: []; back: [] }>()
</script>

<template>
  <section class="space-y-5" :aria-labelledby="`learn-${rule.id}`">
    <div class="space-y-1">
      <p class="text-base font-semibold text-emerald-800">Learn · {{ rule.id }}</p>
      <h2 :id="`learn-${rule.id}`" class="text-3xl font-bold text-emerald-900">{{ rule.title }}</h2>
    </div>

    <p class="rounded-2xl bg-white p-4 text-xl text-slate-900 ring-1 ring-slate-200">{{ rule.statement }}</p>

    <p class="rounded-2xl bg-amber-50 p-4 text-lg text-amber-950 ring-1 ring-amber-200">
      <span class="font-semibold">Watch out for this idea:</span> {{ rule.misconception }}
    </p>

    <div v-for="(frame, i) in rule.frames" :key="i" class="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <DeepCheckBarModel v-if="frame.kind === 'bars'" :rows="frame.rows" />
      <DeepCheckNumberLine v-else :max="frame.max" :marks="frame.marks" :gap="frame.gap" />
      <p class="text-lg text-slate-900">{{ frame.caption }}</p>
    </div>

    <div class="flex flex-wrap gap-3">
      <button type="button" class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-6 text-lg font-bold text-white hover:bg-emerald-800" @click="emit('quiz')">
        Start the fun quiz
      </button>
      <button type="button" class="inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100" @click="emit('back')">
        Back to rules
      </button>
    </div>
  </section>
</template>
