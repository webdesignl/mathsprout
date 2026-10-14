<script setup lang="ts">
import { computed } from 'vue'
import { useTutorStore } from '../../stores/tutor'
import { NOT_SIMPLEST_MESSAGE } from '../../utils/messages'

const store = useTutorStore()
const latestHint = computed(() => store.hints.at(-1) ?? '')
</script>

<template>
  <div role="status" aria-live="polite" class="space-y-3">
    <p v-if="store.busy === 'hint'" class="text-2xl font-semibold text-slate-800">Thinking…</p>
    <p v-if="store.wrongMessage" class="text-2xl font-bold text-indigo-950">{{ store.wrongMessage }}</p>
    <p
      v-if="latestHint && store.state !== 'teach' && store.busy !== 'hint'"
      class="rounded-2xl border-2 border-indigo-700 bg-indigo-50 p-4 text-2xl text-slate-900"
    >
      {{ latestHint }}
    </p>
    <p v-if="store.hintsOffline" class="text-base text-slate-700">The tutor could not be reached, so this hint comes from the app.</p>
    <p
      v-if="store.notSimplest"
      class="rounded-2xl border-2 border-amber-700 bg-amber-100 p-4 text-2xl font-bold text-amber-950"
    >
      {{ NOT_SIMPLEST_MESSAGE }}
    </p>
  </div>
</template>
