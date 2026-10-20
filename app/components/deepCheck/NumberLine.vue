<script setup lang="ts">
const props = defineProps<{
  max: number
  marks: { at: number; label: string }[]
  gap?: { from: number; to: number; label: string }
}>()

const W = 320
const left = 16
const right = W - 16
const x = (value: number) => left + (value / props.max) * (right - left)
const description = computed(
  () => `Number line from 0 to ${props.max}. ${props.marks.map((m) => `${m.label}`).join(' and ')} are marked${props.gap ? `, with the gap ${props.gap.label}` : ''}.`,
)
</script>

<template>
  <svg :viewBox="`0 0 ${W} 100`" class="w-full max-w-md" role="img" :aria-label="description">
    <line :x1="left" :x2="right" y1="60" y2="60" stroke="#334155" stroke-width="3" stroke-linecap="round" />
    <g v-for="n in max + 1" :key="n">
      <line :x1="x(n - 1)" :x2="x(n - 1)" y1="54" y2="66" stroke="#334155" stroke-width="2" />
      <text :x="x(n - 1)" y="84" text-anchor="middle" font-size="11" fill="#334155">{{ n - 1 }}</text>
    </g>
    <g v-if="gap">
      <rect :x="x(gap.from)" y="55" :width="x(gap.to) - x(gap.from)" height="10" fill="#fbbf24" opacity="0.8" />
      <text :x="(x(gap.from) + x(gap.to)) / 2" y="36" text-anchor="middle" font-size="12" font-weight="700" fill="#78350f">{{ gap.label }}</text>
    </g>
    <g v-for="m in marks" :key="m.label">
      <circle :cx="x(m.at)" cy="60" r="6" fill="#15803d" stroke="#fff" stroke-width="2" />
      <text :x="x(m.at)" y="20" text-anchor="middle" font-size="12" font-weight="700" fill="#14532d">{{ m.label }}</text>
    </g>
  </svg>
</template>
