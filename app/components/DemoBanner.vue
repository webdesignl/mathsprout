<script setup lang="ts">
import { DEMO_NOTICE, DEMO_PIN } from '../utils/demo'

const { isDemo, end } = useDemo()

/** The feedback form: opened from the Feedback button, or when ending the demo. */
const formOpen = ref(false)
const ending = ref(false)

function openForm(isEnding: boolean) {
  ending.value = isEnding
  formOpen.value = true
}

async function finish() {
  formOpen.value = false
  await end()
}

const button = 'inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-base font-bold ring-2 focus-visible:outline-4'
</script>

<template>
  <section v-if="isDemo" aria-label="Demo notice" class="bg-amber-100 px-4 py-2 text-base text-amber-950 sm:px-6">
    <div class="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p class="min-w-0">
        <span class="font-semibold">{{ DEMO_NOTICE }}</span>
        <span class="mt-1 block sm:ml-2 sm:mt-0 sm:inline">Parent PIN: <strong class="rounded bg-white px-2 py-0.5 font-mono text-lg">{{ DEMO_PIN }}</strong></span>
      </p>
      <div class="flex shrink-0 flex-wrap gap-2 self-start sm:self-auto">
        <button type="button" :class="[button, 'bg-amber-950 text-white ring-amber-950']" @click="openForm(false)">Feedback</button>
        <button type="button" :class="[button, 'bg-white text-amber-950 ring-amber-700']" @click="openForm(true)">End demo</button>
      </div>
    </div>
  </section>
  <FeedbackDialog v-if="isDemo" :open="formOpen" :ending="ending" @close="formOpen = false" @finished="finish" />
</template>
