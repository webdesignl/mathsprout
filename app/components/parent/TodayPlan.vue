<script setup lang="ts">
import { useChildStore } from '../../stores/child'
import { kindLabel, type OrderedTask } from '../../utils/todayPlan'

const childStore = useChildStore()
const childId = computed(() => childStore.selectedId)
const { ordered, context, screenTimeDay, dayDoneAt, dayDoneSeen, dayStar, giveDayStar, markDaySeen, loaded, failed, add, setScreenTimeDay, saveOrder, clearOrder, setNote, markSeen, remove } = useTodayData(childId)
const noteDrafts = ref<Record<string, string>>({})
const timeDrafts = ref<Record<string, string>>({})
watch(
  () => ordered.value.open,
  (open) => {
    for (const t of open) {
      if (!(t.id in noteDrafts.value)) noteDrafts.value[t.id] = t.note ?? ''
      if (!(t.id in timeDrafts.value)) timeDrafts.value[t.id] = t.priority_date === context.value.today && t.start_time ? t.start_time.slice(0, 5) : ''
    }
  },
  { immediate: true },
)
const doneClock = computed(() => (dayDoneAt.value ? new Date(dayDoneAt.value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''))
async function giveStar() {
  message.value = (await giveDayStar()) ? 'Star given.' : blocked
}
async function dayDoneSeenNow() {
  if (!(await markDaySeen())) message.value = blocked
}
const unseen = computed(() => ordered.value.open.filter((t) => t.seen_by_parent === false))
async function saveNote(id: string) {
  message.value = (await setNote(id, noteDrafts.value[id] ?? '')) ? 'Note saved.' : blocked
}
async function seen(id: string) {
  if (!(await markSeen(id))) message.value = blocked
}

/** The order being edited. It starts from the rule order and only becomes today's pick when saved. */
const working = ref<OrderedTask[]>([])
const message = ref('')
const dirty = ref(false)
watch(
  () => ordered.value.open,
  (open) => {
    working.value = [...open]
    dirty.value = false
  },
  { immediate: true },
)

const blocked = 'Could not save. Is parent mode still on?'

function move(i: number, by: -1 | 1) {
  const j = i + by
  if (j < 0 || j >= working.value.length) return
  const next = [...working.value]
  ;[next[i], next[j]] = [next[j]!, next[i]!]
  working.value = next
  dirty.value = true
}

async function save() {
  message.value = (await saveOrder(working.value.map((t) => t.id), timeDrafts.value)) ? 'Saved for today.' : blocked
}
async function reset() {
  message.value = (await clearOrder()) ? 'Back to the rule order.' : blocked
}
async function toggleScreen(event: Event) {
  const ok = await setScreenTimeDay((event.target as HTMLInputElement).checked)
  message.value = ok ? '' : blocked
  if (!ok) (event.target as HTMLInputElement).checked = screenTimeDay.value
}
async function del(id: string) {
  if (!(await remove(id))) message.value = blocked
}

const ghost = 'inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-4 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100 disabled:opacity-40'
</script>

<template>
  <section aria-labelledby="plan" class="space-y-4 rounded-2xl bg-white p-5">
    <h2 id="plan" class="text-2xl font-bold">
      Prioritise tasks<span v-if="childStore.selected"> · {{ childStore.selected.nickname }}</span>
    </h2>
    <p v-if="!childStore.selected" class="text-lg text-slate-700">Pick a child above.</p>
    <p v-else-if="failed" role="alert" class="text-lg text-red-800">Could not load the plan.</p>

    <template v-else-if="loaded">
      <label class="flex min-h-12 items-center gap-3 text-xl font-semibold text-slate-900">
        <input type="checkbox" class="size-7 accent-emerald-700" :checked="screenTimeDay" @change="toggleScreen">
        Screen-time day (IXL first)
      </label>
      <p class="text-lg text-slate-700">
        Rules set the order: IXL first on screen-time days, reading last, test prep sooner as tests near
        (MAP: {{ context.mapDoneThisWeek }} of 3 this week). Move tasks to set today’s order.
      </p>

      <div v-if="dayDoneAt && !dayStar" class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-100 p-4 text-lg text-emerald-950" role="status">
        <p class="font-semibold"><span aria-hidden="true">🎉</span> {{ childStore.selected?.nickname }} finished today’s tasks at {{ doneClock }}.</p>
        <span class="flex flex-wrap gap-2">
          <button
            type="button"
            class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-5 text-lg font-bold text-white hover:bg-emerald-800"
            :aria-label="`Give ${childStore.selected?.nickname} a star for finishing today`"
            @click="giveStar"
          >
            <span aria-hidden="true">⭐</span>&nbsp;Give a star
          </button>
          <button v-if="!dayDoneSeen" type="button" :class="ghost" @click="dayDoneSeenNow">Seen</button>
        </span>
      </div>
      <p v-else-if="dayDoneAt" class="text-lg font-semibold text-emerald-900">
        <span aria-hidden="true">⭐</span> Star given. Finished at {{ doneClock }}.
      </p>

      <div v-if="unseen.length" class="rounded-xl bg-amber-100 p-4 text-lg text-amber-950" role="status">
        <p class="font-semibold">New from {{ childStore.selected?.nickname }} ({{ unseen.length }})</p>
        <p>{{ unseen.map((t) => t.title).join(', ') }}</p>
      </div>

      <p v-if="working.length === 0" class="text-lg text-slate-900">No open tasks.</p>
      <ol v-else class="space-y-2">
        <li v-for="(t, i) in working" :key="t.id" class="flex flex-wrap items-center gap-3 rounded-xl border-2 border-slate-300 p-3">
          <span class="min-w-0 flex-1">
            <span class="block text-xl font-bold text-slate-900">{{ i + 1 }}. {{ t.title }}</span>
            <span class="block text-lg text-slate-700">
              {{ kindLabel(t.kind) }} · {{ t.reason }}<span v-if="t.seen_by_parent === false" class="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-base text-amber-950">New</span>
            </span>
            <span class="mt-2 flex flex-wrap items-center gap-2">
              <label class="flex items-center gap-2 text-lg font-semibold text-slate-900">
                Time
                <input
                  v-model="timeDrafts[t.id]"
                  type="time"
                  :aria-label="`Start time for ${t.title}`"
                  class="min-h-12 rounded-xl border-2 border-slate-600 bg-white px-3 text-lg text-slate-900"
                  @input="dirty = true"
                >
              </label>
              <input
                v-model="noteDrafts[t.id]"
                maxlength="200"
                :aria-label="`Note for ${t.title}`"
                placeholder="Add a short note for her"
                class="min-h-12 min-w-48 flex-1 rounded-xl border-2 border-slate-600 bg-white px-3 text-lg text-slate-900"
                @keydown.enter.prevent="saveNote(t.id)"
              >
              <button type="button" :class="ghost" :aria-label="`Save note for ${t.title}`" @click="saveNote(t.id)">Save note</button>
              <button v-if="t.seen_by_parent === false" type="button" :class="ghost" :aria-label="`Mark ${t.title} as seen`" @click="seen(t.id)">Seen</button>
            </span>
          </span>
          <button type="button" :class="ghost" :disabled="i === 0" :aria-label="`Move ${t.title} up`" @click="move(i, -1)">↑</button>
          <button type="button" :class="ghost" :disabled="i === working.length - 1" :aria-label="`Move ${t.title} down`" @click="move(i, 1)">↓</button>
          <button type="button" :class="ghost" :aria-label="`Delete ${t.title}`" @click="del(t.id)">Delete</button>
        </li>
      </ol>

      <div class="flex flex-wrap gap-3">
        <button
          type="button"
          class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-5 text-lg font-bold text-white hover:bg-emerald-800 disabled:opacity-40"
          :disabled="!dirty"
          @click="save"
        >
          Save today’s order
        </button>
        <button type="button" :class="ghost" @click="reset">Use the rule order</button>
      </div>
      <p v-if="message" role="status" class="text-lg font-semibold text-slate-900">{{ message }}</p>


    </template>
  </section>
</template>
