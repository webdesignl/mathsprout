<script setup lang="ts">
const props = defineProps<{
  /** How many equal steps are in 1 whole. */
  parts: number
  /** Where the amount sits, counted in steps. */
  target: number
  top: string
  arcs: { from: number; to: number; label: string }[]
}>()

const W = 320
const left = 20
const right = W - 20
const x = (step: number) => left + (step / props.parts) * (right - left)
const description = computed(() => `A double number line from 0 to 1. The top line marks ${props.top}. The bottom line shows ${props.arcs.map((a) => a.label).join(', then ')}.`)
</script>

<template>
  <svg :viewBox="`0 0 ${W} 190`" class="w-full max-w-md" role="img" :aria-label="description">
    <!-- top line: the amount -->
    <text :x="left" y="14" font-size="12" font-weight="700" fill="#334155">Amount</text>
    <line :x1="left" :x2="right" y1="48" y2="48" stroke="#334155" stroke-width="3" stroke-linecap="round" />
    <g v-for="n in parts + 1" :key="`t${n}`">
      <line :x1="x(n - 1)" :x2="x(n - 1)" y1="42" y2="54" stroke="#334155" stroke-width="2" />
      <text :x="x(n - 1)" y="70" text-anchor="middle" font-size="11" fill="#334155">{{ n - 1 === 0 ? '0' : n - 1 === parts ? '1' : `${n - 1}/${parts}` }}</text>
    </g>
    <circle :cx="x(target)" cy="48" r="7" fill="#15803d" stroke="#fff" stroke-width="2" />
    <text :x="x(target)" y="34" text-anchor="middle" font-size="12" font-weight="700" fill="#14532d">{{ top }}</text>

    <!-- bottom line: the jumps -->
    <text :x="left" y="180" font-size="12" font-weight="700" fill="#334155">Jumps of 1/2</text>
    <line :x1="left" :x2="right" y1="150" y2="150" stroke="#334155" stroke-width="3" stroke-linecap="round" />
    <g v-for="n in parts + 1" :key="`b${n}`">
      <line :x1="x(n - 1)" :x2="x(n - 1)" y1="144" y2="156" stroke="#334155" stroke-width="2" />
    </g>
    <g v-for="(arc, i) in arcs" :key="i">
      <path
        :d="`M ${x(arc.from)} 150 Q ${(x(arc.from) + x(arc.to)) / 2} 98 ${x(arc.to)} 150`"
        fill="none"
        :stroke="i === 0 ? '#0369a1' : '#b45309'"
        stroke-width="3"
        stroke-linecap="round"
      />
      <text :x="(x(arc.from) + x(arc.to)) / 2" y="108" text-anchor="middle" font-size="11" font-weight="700" :fill="i === 0 ? '#075985' : '#78350f'">{{ arc.label }}</text>
    </g>
    <circle :cx="x(target)" cy="150" r="7" fill="#15803d" stroke="#fff" stroke-width="2" />
    <line :x1="x(target)" :x2="x(target)" y1="56" y2="143" stroke="#15803d" stroke-width="2" stroke-dasharray="4 4" />
  </svg>
</template>
