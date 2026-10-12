<script setup lang="ts">
import { computed } from 'vue'
import type { SummaryItem } from '../../stores/practice'
import { describeProblem } from '../../utils/problems'

const props = defineProps<{
  items: SummaryItem[]
  firstTryCount: number
  afterRetryCount: number
  retriedCount: number
  total: number
  extraCredit: number
  extraPending: number
}>()
const emit = defineEmits<{ retry: [index: number]; retryAll: []; learn: [index: number]; again: [] }>()

const missedCount = computed(() => props.items.filter((i) => !i.correct).length)

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-xl font-bold'
</script>

<template>
  <section class="space-y-6">
    <h1 class="text-4xl font-bold text-emerald-900">All done!</h1>
    <p class="text-3xl font-semibold">
      {{ firstTryCount }} of {{ total }} first try<template v-if="retriedCount > 0">,
      {{ afterRetryCount }} of {{ total }} after retry</template>.
    </p>
    <p v-if="extraCredit > 0" class="text-2xl font-semibold text-amber-900">
      <span aria-hidden="true">⭐</span> +{{ extraCredit }} extra credit
    </p>
    <p v-if="extraPending > 0" class="text-xl text-slate-800">
      Extra credit: waiting for a parent.
    </p>

    <ul class="space-y-2">
      <li v-for="item in items" :key="item.index" class="rounded-xl bg-white p-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-xl">
            <span
              :class="item.correct ? 'text-emerald-800' : 'text-red-800'"
              :aria-label="item.firstTry ? 'Right first try' : item.correct ? 'Right after retry' : 'Missed'"
              class="mr-2 font-bold"
              role="img"
            >
              {{ item.correct ? '✓' : '✗' }}
            </span>
            <span class="font-bold">{{ item.number }}.</span> {{ describeProblem(item.problem) }}
            <span v-if="item.retryCorrect && !item.firstTry" class="text-lg text-slate-700"> (retry)</span>
          </p>
          <div v-if="!item.correct" class="flex flex-wrap gap-2">
            <button
              type="button"
              :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800']"
              :aria-label="`Try problem ${item.number} again`"
              @click="emit('retry', item.index)"
            >
              Try again
            </button>
            <button
              type="button"
              :class="[button, 'bg-white text-indigo-900 ring-2 ring-indigo-700 hover:bg-indigo-100']"
              :aria-label="`Learn about problem ${item.number}`"
              @click="emit('learn', item.index)"
            >
              Learn
            </button>
          </div>
        </div>
      </li>
    </ul>

    <div class="flex flex-wrap gap-3">
      <button
        v-if="missedCount > 0"
        type="button"
        :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800']"
        @click="emit('retryAll')"
      >
        Retry all missed
      </button>
      <button
        type="button"
        :class="[button, 'bg-white text-emerald-900 ring-2 ring-emerald-700 hover:bg-emerald-50']"
        @click="emit('again')"
      >
        Practice again
      </button>
    </div>
  </section>
</template>
