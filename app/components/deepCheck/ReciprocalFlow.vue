<script setup lang="ts">
defineProps<{
  steps: { word: string; text: string }[]
  result: string
  balance: { left: string; right: string }
}>()
</script>

<template>
  <div class="space-y-5">
    <ol class="grid gap-3 sm:grid-cols-3">
      <li v-for="(step, i) in steps" :key="step.word" class="relative rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
        <p class="flex items-center gap-2 text-lg font-bold text-emerald-900">
          <span class="flex size-7 items-center justify-center rounded-full bg-emerald-700 text-base text-white" aria-hidden="true">{{ i + 1 }}</span>
          {{ step.word }}
        </p>
        <p class="mt-1 text-base text-slate-900">{{ step.text }}</p>
        <span v-if="step.word === 'Flip'" class="mt-2 inline-flex items-center gap-2 text-lg font-bold text-slate-900" aria-hidden="true">
          <span>2/3</span><span class="inline-block rotate-180 text-emerald-700">⟳</span><span>3/2</span>
        </span>
      </li>
    </ol>
    <p class="rounded-xl bg-white p-3 text-xl font-bold text-slate-900 ring-1 ring-slate-300">{{ result }}</p>

    <!-- A balance: both sides have the same amount -->
    <div class="space-y-1" role="img" :aria-label="`A balance scale. On one side: ${balance.left}. On the other side: ${balance.right}. They are equal.`">
      <div class="grid grid-cols-[1fr_auto_1fr] items-end gap-2 text-center text-base font-bold text-emerald-950">
        <span>{{ balance.left }}</span>
        <span class="text-2xl text-slate-900">=</span>
        <span>{{ balance.right }}</span>
      </div>
      <svg viewBox="0 0 320 110" class="w-full max-w-md" aria-hidden="true" focusable="false">
        <polygon points="160,30 140,98 180,98" fill="#64748b" />
        <rect x="110" y="98" width="100" height="8" rx="4" fill="#334155" />
        <line x1="40" y1="30" x2="280" y2="30" stroke="#334155" stroke-width="5" stroke-linecap="round" />
        <line x1="60" y1="30" x2="40" y2="62" stroke="#334155" stroke-width="2" />
        <line x1="60" y1="30" x2="80" y2="62" stroke="#334155" stroke-width="2" />
        <line x1="260" y1="30" x2="240" y2="62" stroke="#334155" stroke-width="2" />
        <line x1="260" y1="30" x2="280" y2="62" stroke="#334155" stroke-width="2" />
        <path d="M30 62 h60 q-6 14 -30 14 q-24 0 -30 -14 z" fill="#bbf7d0" stroke="#15803d" stroke-width="2" />
        <path d="M230 62 h60 q-6 14 -30 14 q-24 0 -30 -14 z" fill="#bbf7d0" stroke="#15803d" stroke-width="2" />
      </svg>
    </div>
  </div>
</template>
