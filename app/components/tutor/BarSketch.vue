<script setup lang="ts">
import { computed, ref } from 'vue'

/**
 * Her own bar model: cut the bar, colour the parts and label each colour. It is practice only; nothing here is
 * checked or sent anywhere, and it does not decide whether an answer is right.
 */
const MAX_CELLS = 48
const COLOURS = [
  { id: 0, name: 'green', cls: 'bg-emerald-300' },
  { id: 1, name: 'yellow', cls: 'bg-amber-300' },
  { id: 2, name: 'pink', cls: 'bg-pink-300' },
  { id: 3, name: 'blue', cls: 'bg-sky-300' },
  { id: 4, name: 'purple', cls: 'bg-violet-300' },
] as const

const props = withDefaults(defineProps<{ start?: number; checkLabel?: string; locked?: boolean }>(), { start: 4 })
const emit = defineEmits<{ submit: [parts: Array<number | null>] }>()

/** One place for the starting number of parts, used by the first draw and by Start again. */
const blank = () => Array<number | null>(props.start).fill(null)

/** A colour is found by its id, never by its position in the list. */
const colourOf = (id: number | null) => COLOURS.find((c) => c.id === id)

const cells = ref<Array<number | null>>(blank())
const pen = ref<number | null>(0)
const names = ref<Record<number, string>>({})

const used = computed(() => {
  const inUse = new Set(cells.value)
  return COLOURS.filter((c) => inUse.has(c.id))
})

/** Cut the whole bar into this many equal parts. */
function setParts(n: number) {
  const next = Math.min(Math.max(n, 1), MAX_CELLS)
  cells.value = Array.from({ length: next }, (_, i) => cells.value[i] ?? null)
}

/** Cut every part into `by` smaller parts, like drawing more lines in each box. */
function cutEach(by: number) {
  if (cells.value.length * by > MAX_CELLS) return
  cells.value = cells.value.flatMap((c) => Array<number | null>(by).fill(c))
}

function paint(i: number) {
  if (props.locked) return
  cells.value = cells.value.map((c, k) => (k === i ? (c === pen.value ? null : pen.value) : c))
}

function clear() {
  cells.value = blank()
  names.value = {}
  pen.value = 0
}

const small =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-white px-3 text-base font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50'
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Cut the bar">
      <span class="text-base font-semibold text-slate-900">Parts: {{ cells.length }}</span>
      <button type="button" :class="small" aria-label="One fewer part" :disabled="cells.length <= 1" @click="setParts(cells.length - 1)">−</button>
      <button type="button" :class="small" aria-label="One more part" :disabled="cells.length >= MAX_CELLS" @click="setParts(cells.length + 1)">+</button>
      <span class="text-base font-semibold text-slate-900">Cut each part into</span>
      <button
        v-for="by in [2, 3, 4]"
        :key="by"
        type="button"
        :class="small"
        :disabled="cells.length * by > MAX_CELLS"
        @click="cutEach(by)"
      >{{ by }}</button>
    </div>

    <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Colours">
      <span class="text-base font-semibold text-slate-900">Colour:</span>
      <button
        v-for="c in COLOURS"
        :key="c.id"
        type="button"
        :aria-pressed="pen === c.id"
        :aria-label="c.name"
        :class="['size-11 rounded-full border-2 border-slate-700', c.cls, pen === c.id ? 'ring-4 ring-slate-900' : '']"
        @click="pen = c.id"
      />
      <button type="button" :class="small" :aria-pressed="pen === null" @click="pen = null">Rub out</button>
    </div>

    <div class="overflow-x-auto">
      <div class="flex h-14 min-w-full overflow-hidden rounded-lg border-2 border-slate-700 bg-white sm:h-16">
        <button
          v-for="(c, i) in cells"
          :key="i"
          type="button"
          :aria-label="`Part ${i + 1} of ${cells.length}, ${colourOf(c)?.name ?? 'empty'}`"
          :class="['min-w-11 flex-1 border-slate-700', i > 0 ? 'border-l-2' : '', colourOf(c)?.cls ?? 'bg-white']"
          @click="paint(i)"
        />
      </div>
    </div>

    <div v-if="used.length" class="space-y-2">
      <p class="text-base font-semibold text-slate-900">Write what each colour is:</p>
      <label v-for="c in used" :key="c.id" class="flex items-center gap-3">
        <span :class="['size-8 shrink-0 rounded-full border-2 border-slate-700', c.cls]" aria-hidden="true" />
        <span class="sr-only">Label for {{ c.name }}</span>
        <input
          v-model="names[c.id]"
          type="text"
          maxlength="30"
          autocomplete="off"
          class="min-h-11 w-full rounded-xl border-2 border-slate-700 bg-white px-3 text-base text-slate-900"
          placeholder="Write here"
        />
      </label>
    </div>

    <div class="flex flex-wrap gap-3">
      <button
        v-if="checkLabel"
        type="button"
        :disabled="locked"
        class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-6 text-lg font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
        @click="emit('submit', cells)"
      >
        {{ checkLabel }}
      </button>
      <button type="button" :class="small" :disabled="locked" @click="clear">Start again</button>
    </div>
  </div>
</template>
