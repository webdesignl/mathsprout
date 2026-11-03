<script setup lang="ts">
import { computed } from 'vue'
import type { FrameStage } from '../../utils/spacing'

/**
 * A row with margins, objects and gaps, drawn to scale: the pieces she has to take out of the length are different
 * colours, so she can see which space is left for the gaps. The gap size is held back as "?" until she finds it.
 */
const props = defineProps<{ stage: FrameStage; label: string }>()

const WIDTH = 1000
const PAD = 40
const TOP = 120
const HEIGHT = 80
const KINDS = {
  margin: { fill: '#cbd5e1', stroke: '#475569' },
  object: { fill: '#4338ca', stroke: '#312e81' },
  gap: { fill: '#fef3c7', stroke: '#b45309' },
} as const
const TONES = ['#334155', '#047857', '#b45309', '#be123c']

const length = computed(() => Math.max(...props.stage.blocks.map((b) => b.to), 1))
const x = (n: number) => PAD + (n / length.value) * (WIDTH - PAD * 2)
/** An object with no width (a point) is still drawn as a thin bar. */
const widthOf = (b: { from: number; to: number }) => Math.max(x(b.to) - x(b.from), 10)
const wide = computed(() => props.stage.blocks.length > 13)
const k = computed(() => (wide.value ? 1 : 1.3))
</script>

<template>
  <div class="space-y-2">
    <div :class="wide ? 'overflow-x-auto' : ''">
      <svg :viewBox="`0 0 ${WIDTH} 330`" :class="['block h-auto w-full', wide ? 'min-w-[640px]' : '']" role="img" :aria-label="`${label}. ${stage.caption}`">
        <g v-for="(br, i) in stage.braces" :key="`b${i}`">
          <path
            :d="`M ${x(br.from)} ${i === 0 ? TOP - 20 : TOP + HEIGHT + 20} v ${i === 0 ? -14 : 14} H ${x(br.to)} v ${i === 0 ? 14 : -14}`"
            fill="none"
            :stroke="TONES[br.tone % TONES.length]"
            stroke-width="5"
            stroke-linecap="round"
          />
          <text
            :x="(x(br.from) + x(br.to)) / 2"
            :y="i === 0 ? TOP - 46 : TOP + HEIGHT + 20 + 14 + 34 * k"
            text-anchor="middle"
            :font-size="30 * k"
            font-weight="700"
            :fill="TONES[br.tone % TONES.length]"
          >{{ br.label }}</text>
        </g>
        <g v-for="(b, i) in stage.blocks" :key="i">
          <rect
            :x="x(b.from)"
            :y="TOP"
            :width="widthOf(b)"
            :height="HEIGHT"
            :fill="KINDS[b.kind].fill"
            :stroke="KINDS[b.kind].stroke"
            stroke-width="3"
            :stroke-dasharray="b.kind === 'gap' && b.label === '?' ? '10 7' : undefined"
          />
          <text
            v-if="b.label && widthOf(b) > 62 * k"
            :x="x(b.from) + widthOf(b) / 2"
            :y="TOP + HEIGHT / 2 + 10 * k"
            text-anchor="middle"
            :font-size="26 * k"
            font-weight="700"
            :fill="b.kind === 'object' ? '#ffffff' : '#1e293b'"
          >{{ b.label }}</text>
        </g>
      </svg>
    </div>
    <ul class="flex flex-wrap gap-2" aria-label="Kinds of space">
      <li class="rounded-lg bg-slate-300 px-2 py-1 text-base font-semibold text-slate-900">margin</li>
      <li class="rounded-lg bg-indigo-700 px-2 py-1 text-base font-semibold text-white">object</li>
      <li class="rounded-lg bg-amber-100 px-2 py-1 text-base font-semibold text-amber-950 ring-1 ring-amber-700">gap</li>
    </ul>
    <ul v-if="stage.facts.length" class="list-disc space-y-1 pl-6 text-xl text-slate-900" aria-label="What we found so far">
      <li v-for="fact in stage.facts" :key="fact">{{ fact }}</li>
    </ul>
    <p class="text-xl text-slate-800">{{ stage.caption }}</p>
  </div>
</template>
