<script setup lang="ts">
defineProps<{ streak: number; master: boolean }>()
</script>

<template>
  <p class="flex items-center gap-2 text-lg text-slate-800">
    <span :aria-label="`Proof streak: ${streak}`">
      <span aria-hidden="true">⭐</span> {{ streak }}
    </span>
    <span
      v-if="master"
      class="rounded-full bg-amber-200 px-3 py-0.5 text-base font-semibold text-amber-950"
    >
      Proof Master
    </span>
  </p>
</template>
