<script setup lang="ts">
import { deepCheckLink } from '../../utils/modelRules'

/** After a problem: practise the same idea in Deep Check. The links open the rule, its quiz or an Olympiad challenge. */
defineProps<{ ruleId: string; ruleTitle: string; challengeId: string | null }>()

const link =
  'inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 text-lg font-bold text-emerald-900 ring-2 ring-emerald-700 hover:bg-emerald-50'
</script>

<template>
  <section aria-labelledby="practice-links" class="space-y-3 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
    <h2 id="practice-links" class="text-xl font-bold text-slate-900">Practise this idea: {{ ruleTitle }}</h2>
    <div class="flex flex-wrap gap-3">
      <NuxtLink :to="deepCheckLink('learn', ruleId)" :class="link">Look at the rule</NuxtLink>
      <NuxtLink :to="deepCheckLink('quiz', ruleId)" :class="link">Quick quiz</NuxtLink>
      <NuxtLink v-if="challengeId" :to="deepCheckLink('challenge', challengeId)" :class="link">Try an Olympiad problem</NuxtLink>
    </div>
  </section>
</template>
