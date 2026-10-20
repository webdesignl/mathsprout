<script setup lang="ts">
import { useChildStore } from '../../stores/child'

const childStore = useChildStore()
const childId = computed(() => childStore.selectedId)
const { add } = useTodayData(childId)
</script>

<template>
  <section aria-labelledby="one-off" class="space-y-3 rounded-2xl bg-white p-5">
    <h2 id="one-off" class="text-2xl font-bold">
      Add a task<span v-if="childStore.selected"> · {{ childStore.selected.nickname }}</span>
    </h2>
    <p v-if="!childStore.selected" class="text-lg text-slate-700">Pick a child above.</p>
    <TaskAdder v-else :add="add" />
  </section>
</template>
