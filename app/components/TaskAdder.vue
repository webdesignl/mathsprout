<script setup lang="ts">
import { TASK_CATEGORIES, todayString, type TaskCategory, type TaskKind } from '../utils/todayPlan'

const props = defineProps<{
  add: (kind: TaskKind, title: string, due: string | null, minutes?: number | null, category?: TaskCategory) => Promise<boolean>
}>()

/** A task typed by hand has no special type (like IXL); how it behaves comes from "Kind of task". */
const kind: TaskKind = 'homework'
const category = ref<TaskCategory>('important')
/** The short explanation shown under the dropdown, so the options themselves stay short. */
const categoryHint = computed(() => TASK_CATEGORIES.find((c) => c.category === category.value)?.hint ?? '')
const title = ref('')
const due = ref('')
const error = ref('')
const busy = ref(false)

/** Time-sensitive tasks must have a due date. Important ones may have one too. A daily routine has none. */
const wantsDate = computed(() => category.value !== 'routine')

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
  const ok = await props.add(kind, title.value.trim(), wantsDate.value && due.value ? due.value : null, null, category.value)
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
    <div class="min-w-0 max-w-full space-y-1">
      <label class="block min-w-0 max-w-full space-y-1 text-lg font-semibold text-slate-900">
        Kind of task
        <select v-model="category" aria-describedby="kind-hint" :class="[input, 'block w-full max-w-full']">
          <option v-for="c in TASK_CATEGORIES" :key="c.category" :value="c.category">{{ c.label }}</option>
        </select>
      </label>
      <p id="kind-hint" class="max-w-64 text-base text-slate-700">{{ categoryHint }}</p>
    </div>
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
