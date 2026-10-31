<script setup lang="ts">
/**
 * A number line from 0 with hops. The end point is shown as "?" when `unknownEnd` is set,
 * so the picture never gives the answer away.
 */
export interface Hop {
  from: number
  to: number
  label: string
}

const props = defineProps<{
  max: number
  hops: Hop[]
  /** The number the child starts on, marked with a dot. */
  start?: { at: number; label: string }
  /** Where the hops end, marked "?". */
  end?: number
  label: string
}>()

const pct = (n: number) => `${(Math.min(Math.max(n, 0), props.max) / props.max) * 100}%`
const ticks = Array.from({ length: Math.floor(props.max) + 1 }, (_, i) => i)
const arc = (h: Hop) => {
  const x1 = (h.from / props.max) * 1000
  const x2 = (h.to / props.max) * 1000
  return `M ${x1} 100 Q ${(x1 + x2) / 2} 0 ${x2} 100`
}
</script>

<template>
  <div class="space-y-2">
    <div class="relative mx-3 h-32" role="img" :aria-label="label">
      <svg class="absolute inset-x-0 top-0 h-20 w-full overflow-visible" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
        <path
          v-for="(h, i) in hops"
          :key="i"
          :d="arc(h)"
          pathLength="1"
          fill="none"
          stroke="#4338ca"
          stroke-width="4"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
          class="hop"
          :style="{ animationDelay: `${i * 250}ms` }"
        />
      </svg>
      <div class="absolute inset-x-0 top-20 h-1 rounded bg-slate-900" aria-hidden="true" />
      <template v-for="t in ticks" :key="t">
        <span class="absolute top-[4.75rem] h-3 w-0.5 -translate-x-1/2 bg-slate-900" :style="{ left: pct(t) }" aria-hidden="true" />
        <span
          class="absolute top-[6.25rem] -translate-x-1/2 text-sm font-semibold text-slate-800"
          :style="{ left: pct(t) }"
          aria-hidden="true"
        >{{ t }}</span>
      </template>
      <span
        v-for="(h, i) in hops"
        :key="`l${i}`"
        class="absolute top-6 -translate-x-1/2 rounded bg-white px-1 text-base font-bold text-indigo-900"
        :style="{ left: pct((h.from + h.to) / 2) }"
        aria-hidden="true"
      >{{ h.label }}</span>
      <span
        v-if="start"
        class="absolute top-[4.4rem] size-4 -translate-x-1/2 rounded-full border-2 border-slate-900 bg-emerald-400"
        :style="{ left: pct(start.at) }"
        aria-hidden="true"
      />
      <span
        v-if="end !== undefined"
        class="absolute top-[4.1rem] flex size-6 -translate-x-1/2 items-center justify-center rounded-full border-2 border-dashed border-indigo-800 bg-indigo-100 text-sm font-bold text-indigo-900"
        :style="{ left: pct(end) }"
        aria-hidden="true"
      >?</span>
    </div>
    <p class="text-lg font-semibold text-slate-900">{{ label }}</p>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .hop {
    stroke-dasharray: 1;
    animation: draw 0.5s ease-out both;
  }
}
@keyframes draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}
</style>
