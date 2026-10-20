<script setup lang="ts">
import { useChildStore } from '../../stores/child'
import AttemptSummary from './AttemptSummary.vue'
import DeepCheckSummary from './DeepCheckSummary.vue'

const childStore = useChildStore()
</script>

<template>
  <section aria-labelledby="progress" class="space-y-4">
    <h2 id="progress" class="text-2xl font-bold">Progress</h2>
    <p v-if="childStore.children.length === 0" class="rounded-2xl bg-white p-5 text-xl text-slate-900">No children yet.</p>
    <div v-for="c in childStore.children" :key="c.id" class="space-y-4 rounded-2xl bg-white p-5">
      <h3 class="text-xl font-bold text-slate-900">{{ c.nickname }}</h3>
      <AttemptSummary :child-id="c.id" :nickname="c.nickname" />
      <DeepCheckSummary :child-id="c.id" />
    </div>
  </section>
</template>
