<script setup lang="ts">
import type { BarStart } from '../../data/deepCheck'
import { barText, stepBars, type BarAction, type BarState } from '../../utils/deepCheck'

const props = defineProps<{ start: BarStart; dens: number[]; locked?: boolean }>()
const emit = defineEmits<{ submit: [state: BarState] }>()

const state = ref<BarState>({ ...props.start })
const message = ref('')

function act(action: BarAction) {
  if (props.locked) return
  const result = stepBars(state.value, action, props.dens)
  state.value = result.state
  message.value = result.message
}
function reset() {
  state.value = { ...props.start }
  message.value = ''
}

const row = computed(() => ({ den: state.value.den, wholes: state.value.wholes, extra: state.value.pieces, label: `Your bars: ${barText(state.value)}` }))
const tool = 'inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-4 text-base font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100 disabled:opacity-50'
</script>

<template>
  <div class="space-y-4">
    <DeepCheckBarModel :rows="[row]" />

    <div v-if="dens.length > 1" role="group" aria-label="Cut the bar into" class="flex flex-wrap items-center gap-2">
      <span class="text-base font-semibold text-slate-900">Cut into:</span>
      <button
        v-for="d in dens"
        :key="d"
        type="button"
        :aria-pressed="state.den === d"
        :disabled="locked"
        class="min-h-12 rounded-xl px-4 text-base font-bold"
        :class="state.den === d ? 'bg-emerald-700 text-white' : 'bg-white text-slate-900 ring-2 ring-slate-600'"
        @click="act({ type: 'den', den: d })"
      >
        {{ d }}ths
      </button>
    </div>

    <div class="flex flex-wrap gap-2" role="group" aria-label="Change the bars">
      <button type="button" :class="tool" :disabled="locked" aria-label="Add a piece" @click="act({ type: 'addPiece' })">+ piece</button>
      <button type="button" :class="tool" :disabled="locked" aria-label="Take off a piece" @click="act({ type: 'removePiece' })">− piece</button>
      <button type="button" :class="tool" :disabled="locked" aria-label="Add a whole bar" @click="act({ type: 'addWhole' })">+ bar</button>
      <button type="button" :class="tool" :disabled="locked" aria-label="Take off a whole bar" @click="act({ type: 'removeWhole' })">− bar</button>
      <button type="button" :class="tool" :disabled="locked" aria-label="Regroup: pieces that fill a bar become a whole bar" @click="act({ type: 'regroup' })">Regroup</button>
      <button type="button" :class="tool" :disabled="locked" aria-label="Break one whole bar into pieces" @click="act({ type: 'breakWhole' })">Break a bar</button>
    </div>

    <p role="status" class="min-h-6 text-base font-semibold text-red-800">{{ message }}</p>

    <div class="flex flex-wrap gap-3">
      <button
        type="button"
        :disabled="locked"
        class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-6 text-lg font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
        @click="emit('submit', state)"
      >
        Check my drawing
      </button>
      <button type="button" :class="tool" :disabled="locked" @click="reset">Start again</button>
    </div>
  </div>
</template>
