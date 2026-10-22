<script setup lang="ts">
import { DEMO_NOTICE, DEMO_PIN } from '../utils/demo'

const { isDemo, end } = useDemo()
</script>

<template>
  <section v-if="isDemo" aria-label="Demo notice" class="bg-amber-100 px-4 py-2 text-base text-amber-950 sm:px-6">
    <div class="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p class="min-w-0">
        <span class="font-semibold">{{ DEMO_NOTICE }}</span>
        <span class="mt-1 block sm:ml-2 sm:mt-0 sm:inline">Parent PIN: <strong class="rounded bg-white px-2 py-0.5 font-mono text-lg">{{ DEMO_PIN }}</strong></span>
      </p>
      <button
        type="button"
        class="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-xl bg-white px-4 text-base font-bold text-amber-950 ring-2 ring-amber-700 focus-visible:outline-4 sm:self-auto"
        @click="end"
      >
        End demo
      </button>
    </div>
  </section>
</template>
