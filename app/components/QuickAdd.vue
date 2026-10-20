<script setup lang="ts">
import { isOnList, taskTitle, type TaskTemplate } from '../utils/taskTemplates'
import { todayString, type TaskCategory, type TaskKind } from '../utils/todayPlan'

const props = defineProps<{
  /** One button per row, full width (for a side column). */
  stacked?: boolean
  templates: TaskTemplate[]
  openTitles: string[]
  add: (kind: TaskKind, title: string, due: string | null, minutes?: number | null, category?: TaskCategory) => Promise<boolean>
}>()

/** The template waiting for page numbers, if she tapped one that asks for them. */
const asking = ref<TaskTemplate | null>(null)
const detail = ref('')
const due = ref('')
const message = ref('')
const error = ref('')
const busy = ref(false)
const detailInput = ref<HTMLInputElement | null>(null)

async function pick(t: TaskTemplate) {
  message.value = ''
  error.value = ''
  if (t.ask_detail || t.category === 'timed') {
    asking.value = t
    detail.value = ''
    due.value = ''
    await nextTick()
    detailInput.value?.focus()
    return
  }
  await send(t, '')
}

async function send(t: TaskTemplate, text: string) {
  error.value = ''
  if (t.category === 'timed' && (!due.value || due.value < todayString())) {
    error.value = 'Pick the due date first. It cannot be in the past.'
    return
  }
  busy.value = true
  const ok = await props.add(t.kind, taskTitle(t, text), t.category === 'timed' ? due.value : null, t.minutes, t.category)
  busy.value = false
  if (ok) {
    message.value = `Added: ${taskTitle(t, text)}. Your parent will see it.`
    asking.value = null
    detail.value = ''
  } else {
    error.value = 'Could not add it. Try again.'
  }
}

const chip = 'inline-flex min-h-14 w-full items-center rounded-2xl px-5 text-left text-xl font-bold disabled:opacity-60'
</script>

<template>
  <div class="space-y-3">
    <ul :class="stacked ? 'flex flex-col gap-2' : 'flex flex-wrap gap-3'">
      <li v-for="t in templates" :key="t.id" :class="stacked ? 'w-full' : ''">
        <button
          type="button"
          :disabled="busy || (!t.ask_detail && isOnList(t, openTitles))"
          :aria-pressed="asking?.id === t.id"
          :class="[chip, asking?.id === t.id ? 'bg-emerald-700 text-white' : 'bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100']"
          @click="pick(t)"
        >
          {{ t.title }}<span v-if="t.minutes" class="ml-2 font-normal">· {{ t.minutes }} min</span>
          <span v-if="!t.ask_detail && isOnList(t, openTitles)" class="ml-2 font-normal">· on your list</span>
        </button>
      </li>
    </ul>

    <form v-if="asking" class="flex flex-wrap items-end gap-3" @submit.prevent="send(asking, detail)">
      <label class="min-w-48 flex-1 space-y-1 text-lg font-semibold text-slate-900">
        {{ asking.title }}<template v-if="asking.ask_detail">: which pages?</template>
        <input
          v-if="asking.ask_detail"
          ref="detailInput"
          v-model="detail"
          maxlength="60"
          autocomplete="off"
          placeholder="For example: pages 45 to 47"
          class="block min-h-12 w-full rounded-xl border-2 border-slate-600 bg-white px-4 text-xl text-slate-900"
        >
      </label>
      <label v-if="asking.category === 'timed'" class="space-y-1 text-lg font-semibold text-slate-900">
        Due date (required)
        <input v-model="due" type="date" :min="todayString()" required class="block min-h-12 rounded-xl border-2 border-slate-600 bg-white px-4 text-xl text-slate-900">
      </label>
      <button type="submit" :disabled="busy" class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-5 text-lg font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
        Add
      </button>
      <button type="button" class="inline-flex min-h-12 items-center px-3 text-lg font-semibold text-slate-900 underline" @click="asking = null">
        Cancel
      </button>
    </form>

    <p v-if="error" role="alert" class="text-lg font-semibold text-red-800">{{ error }}</p>
    <p v-if="message" role="status" class="text-lg font-semibold text-emerald-900">{{ message }}</p>
  </div>
</template>
