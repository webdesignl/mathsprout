<script setup lang="ts">
import { useChildStore } from '../../stores/child'
import { ageDays } from '../../utils/todayPlan'

const childStore = useChildStore()
const childId = computed(() => childStore.selectedId)
const { backlog, context, loaded, failed, reprioritise, doneOffline, remove } = useTodayData(childId)
const message = ref('')
const blocked = 'Could not save. Is parent mode still on?'

async function run(action: () => Promise<boolean>, done: string) {
  message.value = (await action()) ? done : blocked
}

const ghost = 'inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-4 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100'
</script>

<template>
  <section aria-labelledby="backlog" class="space-y-4 rounded-2xl bg-white p-5">
    <h2 id="backlog" class="text-2xl font-bold">
      Backlog<span v-if="childStore.selected"> · {{ childStore.selected.nickname }}</span>
    </h2>
    <p class="text-lg text-slate-700">Important tasks not done for 4 days or more. Decide what to do with each.</p>
    <p v-if="!childStore.selected" class="text-lg text-slate-700">Pick a child above.</p>
    <p v-else-if="failed" role="alert" class="text-lg text-red-800">Could not load the backlog.</p>
    <template v-else-if="loaded">
      <p v-if="backlog.length === 0" class="text-xl text-slate-900">Nothing waiting. 🎉</p>
      <ul v-else class="space-y-2">
        <li v-for="t in backlog" :key="t.id" class="flex flex-wrap items-center gap-3 rounded-xl border-2 border-slate-300 p-3">
          <span class="min-w-0 flex-1">
            <span class="block text-xl font-bold text-slate-900">{{ t.title }}</span>
            <span class="block text-lg text-slate-700">Waiting {{ ageDays(t, context.today) }} days</span>
          </span>
          <button type="button" :class="ghost" :aria-label="`Put ${t.title} on today’s list`" @click="run(() => reprioritise(t.id), 'Put on today’s list.')">Do it today</button>
          <button type="button" :class="ghost" :aria-label="`${t.title} was done on paper`" @click="run(() => doneOffline(t.id), 'Marked done.')">Done on paper</button>
          <button type="button" :class="ghost" :aria-label="`Delete ${t.title}`" @click="run(() => remove(t.id), 'Deleted.')">Delete</button>
        </li>
      </ul>
      <p v-if="message" role="status" class="text-lg font-semibold text-slate-900">{{ message }}</p>
    </template>
  </section>
</template>
