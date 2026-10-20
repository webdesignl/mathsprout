<script setup lang="ts">
import type { TaskTemplate } from '../utils/taskTemplates'
import type { TaskCategory, TaskKind } from '../utils/todayPlan'

defineProps<{
  templates: TaskTemplate[]
  openTitles: string[]
  add: (kind: TaskKind, title: string, due: string | null, minutes?: number | null, category?: TaskCategory) => Promise<boolean>
}>()
const emit = defineEmits<{ close: [] }>()

type Tab = 'quick' | 'homework' | 'new'
const tabs: { id: Tab; label: string }[] = [
  { id: 'quick', label: 'Quick add' },
  { id: 'homework', label: 'Homework' },
  { id: 'new', label: 'New task' },
]
const tab = ref<Tab>('quick')
const tabButtons = ref<HTMLButtonElement[]>([])

/** Arrow keys move between the tabs, like any tab list. */
function onKey(event: KeyboardEvent, index: number) {
  const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
  if (!step) return
  event.preventDefault()
  const next = (index + step + tabs.length) % tabs.length
  tab.value = tabs[next]!.id
  tabButtons.value[next]?.focus()
}
</script>

<template>
  <section aria-labelledby="add-panel-title" class="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
    <div class="flex items-center justify-between gap-3">
      <h2 id="add-panel-title" class="text-xl font-bold text-slate-900">Add a task</h2>
      <button
        type="button"
        class="inline-flex min-h-11 items-center rounded-lg px-3 text-base font-semibold text-emerald-900 underline underline-offset-4 hover:bg-emerald-50"
        @click="emit('close')"
      >
        Done
      </button>
    </div>

    <div role="tablist" aria-label="Ways to add a task" class="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
      <button
        v-for="(t, i) in tabs"
        :id="`add-tab-${t.id}`"
        :key="t.id"
        :ref="(el) => { if (el) tabButtons[i] = el as HTMLButtonElement }"
        type="button"
        role="tab"
        :aria-selected="tab === t.id"
        :aria-controls="`add-panel-${t.id}`"
        :tabindex="tab === t.id ? 0 : -1"
        class="min-h-11 rounded-lg px-2 text-base font-semibold"
        :class="tab === t.id ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-700 hover:bg-white/60'"
        @click="tab = t.id"
        @keydown="onKey($event, i)"
      >
        {{ t.label }}
      </button>
    </div>

    <div :id="`add-panel-${tab}`" role="tabpanel" :aria-labelledby="`add-tab-${tab}`" class="pt-1">
      <template v-if="tab === 'quick'">
        <p class="mb-3 text-base text-slate-700">Your usual tasks. Tap one to add it.</p>
        <QuickAdd v-if="templates.length" stacked :templates="templates" :open-titles="openTitles" :add="add" />
        <p v-else class="text-base text-slate-900">No usual tasks yet. A parent can set them up. Try “Homework” or “New task”.</p>
      </template>
      <template v-else-if="tab === 'homework'">
        <p class="mb-3 text-base text-slate-700">Type each thing you need to do. Your parent will see it.</p>
        <HomeworkChecklist :add="add" />
      </template>
      <template v-else>
        <p class="mb-3 text-base text-slate-700">Something that is not on the list?</p>
        <TaskAdder :add="add" />
      </template>
    </div>
  </section>
</template>
