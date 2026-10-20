<script setup lang="ts">
import { TASK_CATEGORIES, TASK_KINDS, defaultCategory, todayString, type TaskCategory, type TaskKind } from '../utils/todayPlan'

const props = defineProps<{
  add: (kind: TaskKind, title: string, due: string | null, minutes?: number | null, category?: TaskCategory) => Promise<boolean>
}>()

const kind = ref<TaskKind>('homework')
const category = ref<TaskCategory>('important')
/** Picking a kind suggests its usual category; it can still be changed. */
watch(kind, (k) => (category.value = defaultCategory(k)))
const title = ref('')
const due = ref('')
const error = ref('')
const busy = ref(false)

/** Time-sensitive tasks must have a due date. Homework may have one too. */
const wantsDate = computed(() => category.value === 'timed' || kind.value === 'homework')

async function submit() {
  error.value = ''
  if (!title.value.trim()) {
    error.value = 'Type what the task is.'
    return
  }
  if (category.value === 'timed' && !due.value) {
    error.value = 'Pick the due date. A time-sensitive task needs one.'
    return
  }
  if (category.value === 'timed' && due.value < todayString()) {
    error.value = 'The due date is already past.'
    return
  }
  busy.value = true
  const ok = await props.add(kind.value, title.value.trim(), wantsDate.value && due.value ? due.value : null, null, category.value)
  busy.value = false
  if (ok) {
    title.value = ''
    due.value = ''
  } else {
    error.value = 'Could not add it. Try again.'
  }
}

const input = 'min-h-12 rounded-xl border-2 border-slate-600 bg-white px-4 text-lg text-slate-900'
</script>

<template>
  <form class="flex flex-wrap items-end gap-3" @submit.prevent="submit">
    <label class="space-y-1 text-lg font-semibold text-slate-900">
      Type
      <select v-model="kind" :class="[input, 'block']">
        <option v-for="k in TASK_KINDS" :key="k.kind" :value="k.kind">{{ k.label }}</option>
      </select>
    </label>
    <label class="space-y-1 text-lg font-semibold text-slate-900">
      Kind of task
      <select v-model="category" :class="[input, 'block']">
        <option v-for="c in TASK_CATEGORIES" :key="c.category" :value="c.category">{{ c.label }} · {{ c.hint }}</option>
      </select>
    </label>
    <label class="min-w-48 flex-1 space-y-1 text-lg font-semibold text-slate-900">
      What is it?
      <input v-model="title" maxlength="120" :class="[input, 'block w-full']" autocomplete="off">
    </label>
    <label v-if="wantsDate" class="space-y-1 text-lg font-semibold text-slate-900">
      {{ category === 'timed' ? 'Due date (required)' : 'Due' }}
      <input v-model="due" type="date" :min="todayString()" :required="category === 'timed'" :class="[input, 'block']">
    </label>
    <button
      type="submit"
      :disabled="busy"
      class="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-5 text-lg font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
    >
      Add task
    </button>
    <p v-if="error" role="alert" class="w-full text-lg font-semibold text-red-800">{{ error }}</p>
  </form>
</template>
