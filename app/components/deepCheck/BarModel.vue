<script setup lang="ts">
import type { BarRow } from '../../data/deepCheck'
import { barsFor } from '../../utils/deepCheck'

defineProps<{ rows: BarRow[] }>()
</script>

<template>
  <div class="space-y-3">
    <div v-for="row in rows" :key="row.label" class="space-y-1">
      <p class="text-base font-semibold text-slate-900">{{ row.label }}</p>
      <div class="flex flex-wrap gap-2" role="img" :aria-label="`Bars showing ${row.label}, cut into ${row.den}ths`">
        <div
          v-for="(bar, b) in barsFor(row)"
          :key="b"
          class="flex h-9 w-28 overflow-hidden rounded-md border-2 border-slate-700 bg-white sm:w-36"
        >
          <span
            v-for="p in bar.den"
            :key="p"
            class="h-full flex-1 first:border-l-0"
            :class="[
              row.dotted && bar.kind === 'whole' ? 'border-l-2 border-dashed border-slate-900' : 'border-l border-slate-500',
              p <= bar.shaded ? (bar.kind === 'whole' ? 'bg-emerald-400' : 'bg-amber-300') : 'bg-white',
            ]"
          />
        </div>
      </div>
    </div>
  </div>
</template>
