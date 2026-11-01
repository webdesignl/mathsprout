<script setup lang="ts">
/**
 * Groups of things, for multiplying (equal groups) and dividing (fair sharing).
 * "groups": count boxes each holding `each` things. "share": a pile of `pile` things and `boxes` empty boxes.
 * It never shows the answer: groups are not added up, and the shared boxes stay empty.
 */
const props = defineProps<{
  mode: 'groups' | 'share'
  boxes: number
  /** Things in each box (groups) or in the pile (share). */
  count: number
  label: string
}>()

const items = (n: number) => Array.from({ length: n }, (_, i) => i)
/** Plain dots, never emoji: a picture word can mean the wrong thing (a glass of milk for "glasses"). */
const dot = 'pop inline-block size-6 rounded-full border-2 border-slate-700 bg-emerald-300'
</script>

<template>
  <div class="space-y-3">
    <div v-if="mode === 'share'" class="space-y-1">
      <p class="text-lg font-semibold text-slate-900">The pile to share</p>
      <div class="flex flex-wrap gap-1 rounded-xl border-2 border-dashed border-slate-500 p-2 text-3xl" aria-hidden="true">
        <span v-for="i in items(count)" :key="i" :class="dot" :style="{ animationDelay: `${i * 60}ms` }" />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <div
        v-for="b in items(boxes)"
        :key="b"
        class="flex min-h-20 flex-wrap content-center items-center justify-center gap-1 rounded-xl border-2 border-slate-700 bg-amber-50 p-2 text-3xl"
        aria-hidden="true"
      >
        <template v-if="mode === 'groups'">
          <span v-for="i in items(count)" :key="i" :class="dot" :style="{ animationDelay: `${(b * count + i) * 70}ms` }" />
        </template>
        <span v-else class="text-2xl font-bold text-indigo-800">?</span>
      </div>
    </div>
    <p class="text-lg font-semibold text-slate-900">{{ label }}</p>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .pop {
    animation: pop 0.35s ease-out both;
  }
}
@keyframes pop {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
