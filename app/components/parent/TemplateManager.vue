<script setup lang="ts">
import { useChildStore } from '../../stores/child'
import { TASK_CATEGORIES, TASK_KINDS, defaultCategory, kindLabel, type TaskCategory, type TaskKind } from '../../utils/todayPlan'

const childStore = useChildStore()
const childId = computed(() => childStore.selectedId)
const { templates, loaded, failed, add, addUsualSet, remove } = useTaskTemplates(childId)

const kind = ref<TaskKind>('homework')
const title = ref('')
const minutes = ref<number | null>(null)
const askDetail = ref(false)
const category = ref<TaskCategory>('important')
const repeatDaily = ref(false)
watch(kind, (k) => {
  category.value = defaultCategory(k)
  repeatDaily.value = false
})
const message = ref('')
const blocked = 'Could not save. Is parent mode still on?'

async function submit() {
  message.value = ''
  if (!title.value.trim()) {
    message.value = 'Type a name for the task.'
    return
  }
  const ok = await add({
    kind: kind.value,
    title: title.value.trim(),
    minutes: minutes.value,
    ask_detail: askDetail.value,
    category: category.value,
    repeat_daily: category.value === 'routine' && repeatDaily.value,
  })
  message.value = ok ? 'Added.' : blocked
  if (ok) {
    title.value = ''
    minutes.value = null
    askDetail.value = false
    repeatDaily.value = false
  }
}
async function usual() {
  message.value = (await addUsualSet()) ? 'Added the usual set.' : blocked
}
async function del(id: string) {
  if (!(await remove(id))) message.value = blocked
}

const ghost = 'inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-4 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100'
const input = 'min-h-12 rounded-xl border-2 border-slate-600 bg-white px-4 text-lg text-slate-900'
</script>

<template>
  <section aria-labelledby="usual" class="space-y-4 rounded-2xl bg-white p-5">
    <h2 id="usual" class="text-2xl font-bold">
      Usual tasks<span v-if="childStore.selected"> · {{ childStore.selected.nickname }}</span>
    </h2>
    <p class="text-lg text-slate-700">Set once. She taps to add them.</p>
    <p v-if="!childStore.selected" class="text-lg text-slate-700">Pick a child above.</p>
    <p v-else-if="failed" role="alert" class="text-lg text-red-800">Could not load the usual tasks.</p>

    <template v-else-if="loaded">
      <ul v-if="templates.length" class="space-y-2">
        <li v-for="t in templates" :key="t.id" class="flex flex-wrap items-center gap-3 rounded-xl border-2 border-slate-300 p-3">
          <span class="min-w-0 flex-1 text-xl font-bold text-slate-900">
            {{ t.title }}
            <span class="block text-lg font-normal text-slate-700">
              {{ TASK_CATEGORIES.find((c) => c.category === t.category)?.label }}<template v-if="t.repeat_daily"> · every day</template> · {{ kindLabel(t.kind) }}<template v-if="t.minutes"> · {{ t.minutes }} min</template><template v-if="t.ask_detail"> · she adds pages</template>
            </span>
          </span>
          <button type="button" :class="ghost" :aria-label="`Delete ${t.title}`" @click="del(t.id)">Delete</button>
        </li>
      </ul>
      <button type="button" :class="[ghost, 'bg-emerald-700 text-white ring-0']" @click="usual">
        {{ templates.length ? 'Add any missing usual tasks' : 'Add the usual set' }}
      </button>

      <form class="flex flex-wrap items-end gap-3 border-t-2 border-slate-200 pt-4" @submit.prevent="submit">
        <label class="space-y-1 text-lg font-semibold">Type
          <select v-model="kind" :class="[input, 'block']">
            <option v-for="k in TASK_KINDS" :key="k.kind" :value="k.kind">{{ k.label }}</option>
          </select>
        </label>
        <label class="space-y-1 text-lg font-semibold">Kind of task
          <select v-model="category" :class="[input, 'block']">
            <option v-for="c in TASK_CATEGORIES" :key="c.category" :value="c.category">{{ c.label }}</option>
          </select>
        </label>
        <label class="min-w-48 flex-1 space-y-1 text-lg font-semibold">Name
          <input v-model="title" maxlength="80" :class="[input, 'block w-full']" autocomplete="off">
        </label>
        <label class="space-y-1 text-lg font-semibold">Minutes
          <input v-model.number="minutes" type="number" min="1" max="240" :class="[input, 'block w-24']">
        </label>
        <label v-if="category === 'routine'" class="flex min-h-12 items-center gap-2 text-lg font-semibold">
          <input v-model="repeatDaily" type="checkbox" class="size-6 accent-emerald-700"> Add every day
        </label>
        <label class="flex min-h-12 items-center gap-2 text-lg font-semibold">
          <input v-model="askDetail" type="checkbox" class="size-6 accent-emerald-700"> She adds pages
        </label>
        <button type="submit" :class="[ghost, 'bg-emerald-700 text-white ring-0']">Add usual task</button>
      </form>
      <p v-if="message" role="status" class="text-lg font-semibold text-slate-900">{{ message }}</p>
    </template>
  </section>
</template>
