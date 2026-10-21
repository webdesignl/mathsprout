<script setup lang="ts">
const props = defineProps<{
  cols: number
  rows: number
  /** Columns shaded blue (the first fraction). */
  a: number
  /** Rows shaded yellow (the second fraction). */
  b: number
  aLabel: string
  bLabel: string
  bothLabel: string
}>()

/** A box is blue if its column is in the first part, yellow if its row is in the second part, green if both. */
function cell(r: number, c: number): 'both' | 'a' | 'b' | 'none' {
  const inA = c <= props.a
  const inB = r <= props.b
  return inA && inB ? 'both' : inA ? 'a' : inB ? 'b' : 'none'
}
const colors = { both: 'bg-emerald-400', a: 'bg-sky-300', b: 'bg-amber-300', none: 'bg-white' }
const both = computed(() => props.a * props.b)
</script>

<template>
  <div class="space-y-3">
    <div
      class="grid w-full max-w-xs overflow-hidden rounded-md border-2 border-slate-700"
      :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }"
      role="img"
      :aria-label="`A rectangle of ${cols * rows} boxes. ${aLabel}. ${bLabel}. ${bothLabel}.`"
    >
      <template v-for="r in rows" :key="r">
        <span v-for="c in cols" :key="`${r}-${c}`" class="flex aspect-square items-center justify-center border border-slate-500 text-sm font-bold text-slate-900" :class="colors[cell(r, c)]">
          {{ cell(r, c) === 'both' ? '✓' : '' }}
        </span>
      </template>
    </div>
    <ul class="space-y-1 text-base text-slate-900">
      <li class="flex items-center gap-2"><span class="inline-block size-4 rounded-sm border border-slate-600 bg-sky-300" aria-hidden="true" />{{ aLabel }}</li>
      <li class="flex items-center gap-2"><span class="inline-block size-4 rounded-sm border border-slate-600 bg-amber-300" aria-hidden="true" />{{ bLabel }}</li>
      <li class="flex items-center gap-2"><span class="inline-block size-4 rounded-sm border border-slate-600 bg-emerald-400" aria-hidden="true" />{{ bothLabel }} ({{ both }} boxes marked ✓)</li>
    </ul>
  </div>
</template>
