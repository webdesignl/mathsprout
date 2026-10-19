<script setup lang="ts">
import { useChildStore } from '../stores/child'
import { NO_STARS, starBreakdown, starMessage, totalStars, type StarCounts } from '../utils/stars'

const client = useSupabaseClient()
const childStore = useChildStore()
const counts = ref<StarCounts>({ ...NO_STARS })
const loaded = ref(false)
/** closed -> opening (a few small stars hop out) -> open (the count shows) */
const phase = ref<'closed' | 'opening' | 'open'>('closed')
let timer: ReturnType<typeof setTimeout> | null = null

const total = computed(() => totalStars(counts.value))

async function load(childId: string | null) {
  loaded.value = false
  phase.value = 'closed'
  counts.value = { ...NO_STARS }
  if (!childId) return
  const [ideas, awards] = await Promise.all([
    client.from('ideas').select('id', { count: 'exact', head: true }).eq('child_id', childId).eq('approved', true),
    client.from('awards').select('id', { count: 'exact', head: true }).eq('child_id', childId).eq('kind', 'proof_master'),
  ])
  // Each count stands alone: if one can't be read, it counts as 0 and the other still shows.
  if (ideas.error && awards.error) return
  counts.value = { ideas: ideas.error ? 0 : (ideas.count ?? 0), proofMasters: awards.error ? 0 : (awards.count ?? 0) }
  loaded.value = true
}
watch(() => childStore.selectedId, load, { immediate: true })
onBeforeUnmount(() => timer && clearTimeout(timer))

function open() {
  if (phase.value !== 'closed') return
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    phase.value = 'open'
    return
  }
  phase.value = 'opening'
  timer = setTimeout(() => (phase.value = 'open'), 1000)
}

const hops = [
  { x: '-34px', h: '-34px', delay: '0s' },
  { x: '-17px', h: '-46px', delay: '0.08s' },
  { x: '0px', h: '-52px', delay: '0.03s' },
  { x: '17px', h: '-44px', delay: '0.14s' },
  { x: '34px', h: '-32px', delay: '0.06s' },
]
</script>

<template>
  <div v-if="childStore.selected && loaded" class="relative inline-flex">
    <span v-if="phase === 'opening'" class="pointer-events-none absolute inset-x-0 top-0 flex justify-center" aria-hidden="true">
      <span
        v-for="(s, i) in hops"
        :key="i"
        class="hop absolute text-xl"
        :style="{ '--x': s.x, '--h': s.h, animationDelay: s.delay }"
      >⭐</span>
    </span>

    <button
      v-if="phase !== 'open'"
      type="button"
      class="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-lg font-semibold text-slate-900 ring-2 ring-slate-500 hover:bg-slate-100"
      :disabled="phase === 'opening'"
      @click="open"
    >
      <span aria-hidden="true">🎁</span>
      Open your gift
    </button>
    <p
      v-else
      class="pop inline-flex min-h-12 items-center gap-2 rounded-full bg-amber-100 px-5 text-lg font-semibold text-amber-950 ring-2 ring-amber-400"
      role="status"
      :title="starBreakdown(counts)"
    >
      <span aria-hidden="true">⭐</span>
      {{ starMessage(total) }}
    </p>
  </div>
</template>

<style scoped>
.hop {
  opacity: 0;
  animation: hop 0.9s ease-out forwards;
}
.pop {
  animation: pop 0.35s ease-out;
}
@keyframes hop {
  0% { opacity: 0; transform: translate(calc(var(--x) * 0.2), 8px) scale(0.5); }
  30% { opacity: 1; }
  60% { transform: translate(var(--x), var(--h)) scale(1.1) rotate(160deg); }
  100% { opacity: 0; transform: translate(var(--x), calc(var(--h) * 0.4)) scale(0.8) rotate(300deg); }
}
@keyframes pop {
  from { transform: scale(0.85); opacity: 0.6; }
  to { transform: scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .hop, .pop { animation: none; }
}
</style>
