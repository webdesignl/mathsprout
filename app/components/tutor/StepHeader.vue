<script setup lang="ts">

import { useTutorStore } from '../../stores/tutor'

const store = useTutorStore()
</script>

<template>
  <div v-if="store.plan" class="space-y-3">
    <p class="text-xl font-semibold text-slate-800">Step {{ store.stepIndex + 1 }} of {{ store.stepCount }}</p>
    <p v-if="store.problemText" class="rounded-xl bg-white p-4 text-lg text-slate-800">{{ store.problemText }}</p>
    <ul v-if="store.finishedSteps.length" class="space-y-1 text-lg text-slate-800" aria-label="Your answers so far">
      <li v-for="(done, i) in store.finishedSteps" :key="i">
        Step {{ i + 1 }}: {{ done.label }} <span class="font-bold">{{ done.answer }}</span>
      </li>
    </ul>
  </div>
</template>
