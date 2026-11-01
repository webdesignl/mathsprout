<script setup lang="ts">
import { computed } from 'vue'

/**
 * A number line from 0 with hops. Everything is drawn inside one SVG, so the line, ticks, hops and
 * labels always stay lined up whatever the screen size. The end point is shown as "?" when `end` is set,
 * so the picture never gives the answer away.
 */
export interface Hop {
  from: number
  to: number
  label: string
}

const props = defineProps<{
  /** The biggest number the hops reach. The line is drawn up to the whole number at or above it. */
  max: number
  hops: Hop[]
  /** The number the child starts on, marked with a dot. */
  start?: { at: number; label: string }
  /** Where the hops end, marked "?". */
  end?: number
  label: string
}>()

const WIDTH = 1000
const PAD = 40
const LINE_Y = 120

const axisMax = computed(() => Math.max(Math.ceil(props.max), 1))
const ticks = computed(() => Array.from({ length: axisMax.value + 1 }, (_, i) => i))
const x = (n: number) => PAD + (Math.min(Math.max(n, 0), axisMax.value) / axisMax.value) * (WIDTH - PAD * 2)
const arc = (h: Hop) => `M ${x(h.from)} ${LINE_Y} Q ${(x(h.from) + x(h.to)) / 2} 20 ${x(h.to)} ${LINE_Y}`
</script>

<template>
  <div class="space-y-2">
    <svg viewBox="0 0 1000 180" class="block h-auto w-full" role="img" :aria-label="label">
      <path
        v-for="(h, i) in hops"
        :key="i"
        :d="arc(h)"
        pathLength="1"
        fill="none"
        stroke="#4338ca"
        stroke-width="5"
        stroke-linecap="round"
        class="hop"
        :style="{ animationDelay: `${i * 250}ms` }"
      />
      <text
        v-for="(h, i) in hops"
        :key="`l${i}`"
        :x="(x(h.from) + x(h.to)) / 2"
        y="62"
        text-anchor="middle"
        font-size="30"
        font-weight="700"
        fill="#312e81"
        stroke="white"
        stroke-width="8"
        paint-order="stroke"
      >{{ h.label }}</text>
      <line :x1="PAD" :x2="WIDTH - PAD" :y1="LINE_Y" :y2="LINE_Y" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />
      <g v-for="t in ticks" :key="t">
        <line :x1="x(t)" :x2="x(t)" :y1="LINE_Y - 2" :y2="LINE_Y + 14" stroke="#0f172a" stroke-width="3" />
        <text :x="x(t)" y="158" text-anchor="middle" font-size="28" font-weight="600" fill="#1e293b">{{ t }}</text>
      </g>
      <circle v-if="start" :cx="x(start.at)" :cy="LINE_Y" r="11" fill="#34d399" stroke="#0f172a" stroke-width="3" />
      <g v-if="end !== undefined">
        <circle :cx="x(end)" :cy="LINE_Y" r="17" fill="#e0e7ff" stroke="#3730a3" stroke-width="3" stroke-dasharray="6 4" />
        <text :x="x(end)" :y="LINE_Y + 9" text-anchor="middle" font-size="26" font-weight="700" fill="#312e81">?</text>
      </g>
    </svg>
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
