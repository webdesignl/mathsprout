<script setup lang="ts">
import { computed } from 'vue'
import type { SpacingStage } from '../../utils/spacing'

/**
 * Things in a row on a number line: dots are the things, arcs are the gaps between them, so she can see that the
 * gaps and the things are different counts. The picture only ever holds what she has earned; an unknown end is a
 * dashed arrow ending in "?". Everything is one SVG, so the line, dots and words stay lined up at every size.
 */
const props = defineProps<{ stage: SpacingStage; label: string }>()

const WIDTH = 1000
const PAD = 70
const LINE_Y = 190
/** Arcs start clear of the dots, their numbers and their names. */
const BASE = 78
const TONES = ['#4338ca', '#047857', '#b45309', '#be123c']
const DOT_COLOURS = { 0: '#312e81', 1: '#be123c', 2: '#94a3b8' } as const

const positions = computed(() => [
  1,
  ...props.stage.dots.map((d) => d.at),
  ...props.stage.arcs.flatMap((a) => [a.from, a.to]),
  ...(props.stage.open ? [props.stage.open.from] : []),
])
const lastKnown = computed(() => Math.max(...positions.value))
/** Room after the last known thing for the unknown end. */
const axisMax = computed(() => lastKnown.value + (props.stage.open ? Math.max(3, Math.round(lastKnown.value * 0.4)) : 1))
const x = (n: number) => PAD + ((n - 1) / Math.max(axisMax.value - 1, 1)) * (WIDTH - PAD * 2)
/** Numbers under every dot when there is room, otherwise only under the named ones. */
const crowded = computed(() => axisMax.value > 22)
const wide = computed(() => axisMax.value > 12)
/** Few things on a phone-sized picture: bigger words, so they stay readable when the SVG shrinks. */
const k = computed(() => (wide.value ? 1 : 1.5))

const arcPath = (from: number, to: number, side: 'above' | 'below') => {
  const dir = side === 'above' ? -1 : 1
  const lift = Math.min(90, 30 + (to - from) * 3)
  const y = LINE_Y + dir * BASE
  return `M ${x(from)} ${y} Q ${(x(from) + x(to)) / 2} ${y + dir * lift * 2} ${x(to)} ${y}`
}
const arcMid = (a: { from: number; to: number; side: 'above' | 'below' }) => {
  const dir = a.side === 'above' ? -1 : 1
  const lift = Math.min(90, 30 + (a.to - a.from) * 3)
  return { x: (x(a.from) + x(a.to)) / 2, y: LINE_Y + dir * (BASE + lift) + (a.side === 'above' ? -14 : 34) }
}
const anchor = (n: number) => (x(n) > WIDTH - 170 ? 'end' : x(n) < 170 ? 'start' : 'middle')
const numbered = (d: { at: number; label?: string }) => !crowded.value || Boolean(d.label)
</script>

<template>
  <div class="space-y-2">
    <div :class="wide ? 'overflow-x-auto' : ''">
      <svg
        :viewBox="`0 0 ${WIDTH} 430`"
        :class="['block h-auto w-full', wide ? 'min-w-[640px]' : '']"
        role="img"
        :aria-label="`${label}. ${stage.caption}`"
      >
        <line :x1="PAD - 20" :x2="WIDTH - PAD + 20" :y1="LINE_Y" :y2="LINE_Y" stroke="#334155" stroke-width="5" stroke-linecap="round" />

        <path
          v-for="(a, i) in stage.arcs"
          :key="`a${i}`"
          :d="arcPath(a.from, a.to, a.side)"
          fill="none"
          :stroke="TONES[a.tone % TONES.length]"
          stroke-width="6"
          stroke-linecap="round"
        />
        <text
          v-for="(a, i) in stage.arcs.filter((m) => m.label)"
          :key="`al${i}`"
          :x="arcMid(a).x"
          :y="arcMid(a).y"
          text-anchor="middle"
          :font-size="32 * k"
          font-weight="700"
          :fill="TONES[a.tone % TONES.length]"
          stroke="white"
          stroke-width="7"
          paint-order="stroke"
        >{{ a.label }}</text>

        <g v-if="stage.open">
          <path
            :d="`M ${x(stage.open.from)} ${LINE_Y + BASE} Q ${(x(stage.open.from) + x(axisMax)) / 2} ${LINE_Y + BASE + 140} ${x(axisMax)} ${LINE_Y + BASE}`"
            fill="none"
            stroke="#b45309"
            stroke-width="6"
            stroke-dasharray="14 12"
            stroke-linecap="round"
          />
          <circle :cx="x(axisMax)" :cy="LINE_Y" r="16" fill="white" stroke="#b45309" stroke-width="5" stroke-dasharray="6 5" />
          <text :x="x(axisMax)" :y="LINE_Y + 9" text-anchor="middle" font-size="26" font-weight="800" fill="#b45309">?</text>
          <text
            :x="(x(stage.open.from) + x(axisMax)) / 2"
            :y="LINE_Y + BASE + 104"
            text-anchor="middle"
            :font-size="32 * k"
            font-weight="700"
            fill="#b45309"
            stroke="white"
            stroke-width="7"
            paint-order="stroke"
          >{{ stage.open.label }}</text>
        </g>

        <g v-for="d in stage.dots" :key="d.at">
          <circle :cx="x(d.at)" :cy="LINE_Y" :r="d.tone === 2 ? 11 : 16" :fill="DOT_COLOURS[d.tone]" stroke="white" stroke-width="3" />
          <text v-if="numbered(d)" :x="x(d.at)" :y="LINE_Y + 50" text-anchor="middle" :font-size="26 * k" font-weight="600" fill="#1e293b">{{ d.at }}</text>
          <text
            v-if="d.label"
            :x="x(d.at)"
            :y="LINE_Y - 30"
            :text-anchor="anchor(d.at)"
            :font-size="26 * k"
            font-weight="700"
            :fill="d.tone === 1 ? '#be123c' : '#312e81'"
            stroke="white"
            stroke-width="6"
            paint-order="stroke"
          >{{ d.label }}</text>
        </g>
      </svg>
    </div>
    <p class="text-xl text-slate-800">{{ stage.caption }}</p>
  </div>
</template>
