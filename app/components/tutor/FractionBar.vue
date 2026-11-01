<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { BarStage } from '../../utils/fractionBar'

/**
 * One stage of the fraction bar model. It plays in three phases: the bar as it was, then the new cut lines
 * and the given part, then this step's answer in a new colour. With `still` it shows the finished bar.
 */
const props = defineProps<{ stage: BarStage; still?: boolean; replay?: number; /** Leave out the caption under the bar (the caller shows its own). */ quiet?: boolean }>()

const TONES = ['bg-emerald-300', 'bg-amber-300', 'bg-pink-300', 'bg-sky-300', 'bg-violet-300', 'bg-orange-300']
const TEXT = ['text-emerald-900', 'text-amber-900', 'text-pink-900', 'text-sky-900', 'text-violet-900', 'text-orange-900']

const phase = ref<0 | 1 | 2>(2)
let timers: ReturnType<typeof setTimeout>[] = []

function play() {
  timers.forEach(clearTimeout)
  timers = []
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (props.still || reduced) {
    phase.value = 2
    return
  }
  phase.value = 0
  timers.push(setTimeout(() => (phase.value = 1), 700), setTimeout(() => (phase.value = 2), 1900))
}

onMounted(play)
watch(() => [props.stage, props.replay, props.still], play)
onBeforeUnmount(() => timers.forEach(clearTimeout))

const cells = computed(() => props.stage.after.cells)
/** How many new cells each old cell is cut into. The lines between old cells stay; the others fade in. */
const factor = computed(() => (props.stage.before.cells > 0 ? cells.value / props.stage.before.cells : 1))

/** Marks showing in this phase. The ones the bar already had are always there. */
const visible = computed(() => {
  const old = props.stage.before.marks.length
  return props.stage.after.marks.filter((m, i) => (phase.value === 0 ? i < old : m.phase <= phase.value))
})

const cellTone = (j: number): number | null => {
  for (let k = visible.value.length - 1; k >= 0; k--) {
    const m = visible.value[k]!
    if (j >= m.start && j < m.start + m.count) return m.tone
  }
  return null
}
const lastMark = computed(() => props.stage.after.marks.at(-1)!)
const isAnswerCell = (j: number) => phase.value === 2 && j >= lastMark.value.start && j < lastMark.value.start + lastMark.value.count
const newLine = (j: number) => j > 0 && j % factor.value !== 0

const pct = (n: number) => `${(n / cells.value) * 100}%`
const labelled = computed(() => visible.value.filter((m) => m.label))
const summary = computed(() => props.stage.caption)
</script>

<template>
  <div class="space-y-2" role="img" :aria-label="summary">
    <p class="text-lg font-bold text-slate-900">{{ stage.whole }}</p>
    <div class="h-2 rounded-t-md border-2 border-b-0 border-slate-700" aria-hidden="true" />
    <div class="flex h-14 overflow-hidden rounded-lg border-2 border-slate-700 bg-white sm:h-16" aria-hidden="true">
      <span
        v-for="j in cells"
        :key="j"
        :class="[
          'flex-1 transition-colors duration-700',
          cellTone(j - 1) === null ? 'bg-white' : TONES[cellTone(j - 1)! % TONES.length],
          j > 1 && newLine(j - 1)
            ? ['border-l-2 border-dashed', phase === 0 ? 'border-transparent' : 'border-slate-700']
            : j > 1
              ? 'border-l-2 border-slate-700'
              : '',
          isAnswerCell(j - 1) ? 'ring-4 ring-inset ring-slate-900' : '',
        ]"
      />
    </div>
    <div aria-hidden="true">
      <div v-for="(m, i) in labelled" :key="i" class="relative h-12">
        <span
          class="absolute top-0 h-2 rounded-b-md border-2 border-t-0 border-slate-600"
          :style="{ left: pct(m.start), width: pct(m.count) }"
        />
        <span
          :class="['absolute top-3 whitespace-nowrap text-base font-bold sm:text-lg', TEXT[m.tone % TEXT.length]]"
          :style="m.start + m.count / 2 > cells / 2 ? { right: pct(cells - m.start - m.count) } : { left: pct(m.start) }"
        >{{ m.label }}</span>
      </div>
    </div>
    <p v-if="!quiet" class="text-lg font-semibold text-slate-900">{{ stage.caption }}</p>
  </div>
</template>
