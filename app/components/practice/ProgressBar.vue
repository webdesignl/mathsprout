<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ current: number; total: number; score: number }>()
const percent = computed(() => Math.round(((props.current - 1) / props.total) * 100))
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between text-xl font-semibold text-slate-900">
      <span>Problem {{ current }} of {{ total }}</span>
      <span>Score: {{ score }}</span>
    </div>
    <div
      role="progressbar"
      aria-label="Problems finished"
      :aria-valuenow="current - 1"
      aria-valuemin="0"
      :aria-valuemax="total"
      class="h-4 overflow-hidden rounded-full bg-emerald-200"
    >
      <div class="h-full rounded-full bg-emerald-700 transition-all" :style="{ width: `${percent}%` }" />
    </div>
  </div>
</template>
