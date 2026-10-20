<script setup lang="ts">
import type { TaskKind } from '../utils/todayPlan'

const props = defineProps<{ add: (kind: TaskKind, title: string, due: string | null) => Promise<boolean> }>()

const MAX_LINES = 10
const lines = ref<string[]>([''])
const message = ref('')
const error = ref('')
const busy = ref(false)
const inputs = ref<HTMLInputElement[]>([])

async function addLine() {
  if (lines.value.length >= MAX_LINES) return
  lines.value.push('')
  await nextTick()
  inputs.value.at(-1)?.focus()
}

function removeLine(i: number) {
  lines.value.splice(i, 1)
  if (lines.value.length === 0) lines.value.push('')
}

async function send() {
  message.value = ''
  error.value = ''
  const items = lines.value.map((l) => l.trim()).filter(Boolean)
  if (items.length === 0) {
    error.value = 'Type at least one homework item.'
    return
  }
  busy.value = true
  const results = await Promise.all(items.map((title) => props.add('homework', title, null)))
  busy.value = false
  const failed = items.filter((_, i) => !results[i])
  if (failed.length) {
    // Keep only what did not go through, so nothing is lost or sent twice.
    lines.value = failed
    error.value = 'Some items did not go through. Try again.'
  } else {
    lines.value = ['']
    message.value = `Sent ${items.length === 1 ? '1 item' : `${items.length} items`}. Your parent will see it.`
  }
}

const input = 'min-h-12 w-full rounded-xl border-2 border-slate-600 bg-white px-4 text-xl text-slate-900'
</script>

<template>
  <form class="space-y-3" @submit.prevent="send">
    <ul class="space-y-2">
      <li v-for="(_line, i) in lines" :key="i" class="flex items-center gap-2">
        <span aria-hidden="true" class="size-7 shrink-0 rounded-md border-2 border-slate-500" />
        <input
          :ref="(el) => { if (el) inputs[i] = el as HTMLInputElement }"
          v-model="lines[i]"
          maxlength="120"
          autocomplete="off"
          :aria-label="`Homework item ${i + 1}`"
          placeholder="For example: Page 12, questions 1 to 5"
          :class="input"
          @keydown.enter.prevent="addLine"
        >
        <button
          v-if="lines.length > 1"
          type="button"
          class="inline-flex min-h-12 shrink-0 items-center rounded-xl px-3 text-lg font-semibold text-slate-900 underline"
          :aria-label="`Remove item ${i + 1}`"
          @click="removeLine(i)"
        >
          Remove
        </button>
      </li>
    </ul>
    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="inline-flex min-h-12 items-center rounded-xl bg-white px-4 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100 disabled:opacity-40"
        :disabled="lines.length >= MAX_LINES"
        @click="addLine"
      >
        Add another line
      </button>
      <button
        type="submit"
        :disabled="busy"
        class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-5 text-lg font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        Send to my list
      </button>
    </div>
    <p v-if="error" role="alert" class="text-lg font-semibold text-red-800">{{ error }}</p>
    <p v-if="message" role="status" class="text-lg font-semibold text-emerald-900">{{ message }}</p>
  </form>
</template>
