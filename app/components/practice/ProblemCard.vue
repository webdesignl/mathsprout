<script setup lang="ts">
import { computed } from 'vue'
import type { MixedNumber, Problem } from '../../utils/fraction'

const props = defineProps<{ problem: Problem }>()

/** Problems from the generator are always mixed numbers. */
const parts = computed(() => [props.problem.a, props.problem.b] as MixedNumber[])
const symbol = computed(() => (props.problem.op === 'add' ? '+' : '−'))

function spoken(m: MixedNumber): string {
  const fraction = `${m.num} over ${m.den}`
  if (m.num === 0) return String(m.whole)
  return m.whole === 0 ? fraction : `${m.whole} and ${fraction}`
}

const label = computed(
  () =>
    `${spoken(parts.value[0]!)} ${props.problem.op === 'add' ? 'plus' : 'minus'} ${spoken(parts.value[1]!)}`,
)
</script>

<template>
  <div
    role="img"
    :aria-label="label"
    class="flex flex-wrap items-center justify-center gap-5 rounded-2xl bg-white p-6 text-5xl font-bold text-slate-900 shadow-sm"
  >
    <template v-for="(m, i) in parts" :key="i">
      <span v-if="i === 1" class="px-1 text-emerald-800" aria-hidden="true">{{ symbol }}</span>
      <span class="flex items-center gap-2" aria-hidden="true">
        <span v-if="m.whole > 0 || m.num === 0">{{ m.whole }}</span>
        <span v-if="m.num > 0" class="flex flex-col items-center text-4xl leading-tight">
          <span>{{ m.num }}</span>
          <span class="my-1 h-1 w-full rounded bg-slate-900" />
          <span>{{ m.den }}</span>
        </span>
      </span>
    </template>
  </div>
</template>
