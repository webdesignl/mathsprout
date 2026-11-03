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
/** A block too narrow to hold its words is named underneath, and the lower bracket moves down out of the way. */
const anyOutside = computed(() => props.stage.blocks.some((b) => widthOf(b) <= 90 * k.value))
/** The value's size, shrunk so a long label such as "1 5/8 feet" stays inside its block. */
const fit = (b: { from: number; to: number; label: string }) => Math.min(28 * k.value, (widthOf(b) * 0.92) / Math.max(b.label.length * 0.56, 1))
const LEGEND = {
  margin: 'bg-slate-300 text-slate-900',
  object: 'bg-indigo-700 text-white',
  gap: 'bg-amber-100 text-amber-950 ring-1 ring-amber-700',
} as const
/**
 * One chip for each kind of piece in the row, saying what it is and how long (or "?" for a gap not found yet).
 * Taking the first block of a kind is right: every margin has the same width, every object the same width and name,
 * and every gap the same size, because the builder draws them from one value each (see buildFramePlan).
 */
const legend = computed(() =>
  (['margin', 'object', 'gap'] as const).flatMap((kind) => {
    const b = props.stage.blocks.find((x) => x.kind === kind)
    return b ? [{ kind, cls: LEGEND[kind], text: b.label ? `${b.name}: ${b.label}` : b.name }] : []
  }),
)
const anchorOf = (i: number) => (i === 0 ? 'start' : i === props.stage.blocks.length - 1 ? 'end' : 'middle')
const belowY = computed(() => TOP + HEIGHT + 20 + (anyOutside.value ? 70 * k.value : 0))
const wide = computed(() => props.stage.blocks.length > 13)
const k = computed(() => (wide.value ? 1 : 1.6))
</script>

<template>
  <div class="space-y-2">
    <div :class="wide ? 'overflow-x-auto' : ''">
      <svg :viewBox="`0 0 ${WIDTH} 400`" :class="['block h-auto w-full', wide ? 'min-w-[640px]' : '']" role="img" :aria-label="`${label}. ${stage.caption}`">
        <g v-for="(br, i) in stage.braces" :key="`b${i}`">
          <path
            :d="`M ${x(br.from)} ${i === 0 ? TOP - 20 : belowY} v ${i === 0 ? -14 : 14} H ${x(br.to)} v ${i === 0 ? 14 : -14}`"
            fill="none"
            :stroke="TONES[br.tone % TONES.length]"
            stroke-width="5"
            stroke-linecap="round"
          />
          <text
            :x="(x(br.from) + x(br.to)) / 2"
            :y="i === 0 ? TOP - 46 : belowY + 14 + 34 * k"
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
          <g class="hidden sm:inline">
          <template v-if="widthOf(b) > 90 * k">
            <text :x="x(b.from) + widthOf(b) / 2" :y="TOP + HEIGHT / 2 - 6 * k" text-anchor="middle" :font-size="22 * k" font-weight="600" :fill="b.kind === 'object' ? '#e0e7ff' : '#475569'">{{ b.name }}</text>
            <text :x="x(b.from) + widthOf(b) / 2" :y="TOP + HEIGHT / 2 + 26 * k" text-anchor="middle" :font-size="fit(b)" font-weight="800" :fill="b.kind === 'object' ? '#ffffff' : '#1e293b'">{{ b.label }}</text>
          </template>
          <template v-else>
            <line :x1="x(b.from) + widthOf(b) / 2" :x2="x(b.from) + widthOf(b) / 2" :y1="TOP + HEIGHT" :y2="TOP + HEIGHT + 16" stroke="#475569" stroke-width="3" />
            <text :x="x(b.from) + widthOf(b) / 2" :y="TOP + HEIGHT + 16 + 24 * k" :text-anchor="anchorOf(i)" :font-size="22 * k" font-weight="600" fill="#475569">{{ b.name }}</text>
            <text v-if="b.label" :x="x(b.from) + widthOf(b) / 2" :y="TOP + HEIGHT + 16 + 52 * k" :text-anchor="anchorOf(i)" :font-size="28 * k" font-weight="800" fill="#1e293b">{{ b.label }}</text>
          </template>
          </g>
        </g>
      </svg>
    </div>
    <!-- On a phone the words would be too small inside the picture, so each colour is explained here instead. -->
    <ul class="flex flex-wrap gap-2" aria-label="What each colour is">
      <li v-for="item in legend" :key="item.kind" :class="['rounded-lg px-3 py-1 text-lg font-semibold', item.cls]">{{ item.text }}</li>
    </ul>
    <ul v-if="stage.facts.length" class="list-disc space-y-1 pl-6 text-xl text-slate-900" aria-label="What we found so far">
      <li v-for="fact in stage.facts" :key="fact">{{ fact }}</li>
    </ul>
    <p class="text-xl text-slate-800">{{ stage.caption }}</p>
  </div>
</template>
