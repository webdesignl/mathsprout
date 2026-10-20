<script setup lang="ts">
import { useChildStore } from '../../stores/child'
import { daysBetween, todayString } from '../../utils/todayPlan'

const client = useSupabaseClient()
const childStore = useChildStore()
const historyUnseen = useState<number>('history-unseen', () => 0)
const unseenCompletions = useState<number>('unseen-completions', () => 0)

interface Row {
  child_id: string
  summary_date: string
  summary: string
  done_count: number
  finished_all: boolean
  seen: boolean
  starred: boolean
}

const rows = ref<Row[]>([])
const failed = ref(false)
const message = ref('')
const today = todayString()
const blocked = 'Could not save. Is parent mode still on?'

async function load() {
  failed.value = false
  const [sums, stars] = await Promise.all([
    client.from('day_summaries').select('child_id, summary_date, summary, done_count, finished_all, seen').order('summary_date', { ascending: false }),
    client.from('awards').select('child_id, award_date').eq('kind', 'day_done'),
  ])
  if (sums.error || !sums.data) {
    failed.value = true
    return
  }
  const starred = new Set((stars.data ?? []).map((a) => `${a.child_id}|${a.award_date}`))
  rows.value = sums.data.map((r) => ({ ...r, starred: starred.has(`${r.child_id}|${r.summary_date}`) }))
  historyUnseen.value = rows.value.filter((r) => r.finished_all && !r.seen).length
}
onMounted(load)

function who(id: string) {
  return childStore.children.find((c) => c.id === id)?.nickname ?? 'Child'
}
function dateText(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y!, m! - 1, day!).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
/** A finished day can be starred for a week. */
function open(r: Row) {
  return r.finished_all && !r.seen && daysBetween(r.summary_date, today) <= 7
}
function lapsed(r: Row) {
  return r.finished_all && !r.seen && daysBetween(r.summary_date, today) > 7
}

async function star(r: Row) {
  message.value = ''
  const { error } = await client.rpc('give_day_star', { child_id: r.child_id, plan_date: r.summary_date })
  if (error) message.value = /week/i.test(error.message) ? 'A day can be starred within a week.' : blocked
  else {
    unseenCompletions.value = Math.max(0, unseenCompletions.value - 1)
    await load()
  }
}
async function seen(r: Row) {
  message.value = ''
  const { error } = await client.rpc('mark_summary_seen', { child_id: r.child_id, summary_date: r.summary_date })
  if (error) message.value = blocked
  else {
    unseenCompletions.value = Math.max(0, unseenCompletions.value - 1)
    await load()
  }
}

const ghost = 'inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-4 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100'
</script>

<template>
  <section aria-labelledby="history" class="space-y-4">
    <h2 id="history" class="text-2xl font-bold">History</h2>
    <p class="text-lg text-slate-700">The last 30 days. Today’s finished day shows here tomorrow.</p>
    <p v-if="message" role="alert" class="text-lg font-semibold text-red-800">{{ message }}</p>
    <p v-if="failed" role="alert" class="text-lg text-red-800">Could not load the history.</p>
    <p v-else-if="rows.length === 0" class="rounded-2xl bg-white p-5 text-xl text-slate-900">No past days yet.</p>
    <ul v-else class="space-y-3">
      <li v-for="r in rows" :key="r.child_id + r.summary_date" class="space-y-2 rounded-2xl bg-white p-5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-xl font-bold text-slate-900">
            {{ dateText(r.summary_date) }}<span v-if="childStore.children.length > 1"> · {{ who(r.child_id) }}</span>
          </p>
          <p class="text-lg font-semibold" :class="r.finished_all ? 'text-emerald-900' : 'text-slate-700'">
            {{ r.finished_all ? 'Finished the day' : `${r.done_count} done` }}
          </p>
        </div>
        <p class="text-lg text-slate-900">{{ r.summary }}</p>
        <div v-if="open(r)" class="flex flex-wrap gap-3">
          <button
            type="button"
            class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-5 text-lg font-bold text-white hover:bg-emerald-800"
            :aria-label="`Give a star for ${dateText(r.summary_date)}`"
            @click="star(r)"
          >
            <span aria-hidden="true">⭐</span>&nbsp;Give a star
          </button>
          <button type="button" :class="ghost" :aria-label="`Mark ${dateText(r.summary_date)} as seen`" @click="seen(r)">Seen</button>
        </div>
        <p v-else-if="r.starred" class="text-lg font-semibold text-amber-900"><span aria-hidden="true">⭐</span> Star given</p>
        <p v-else-if="lapsed(r)" class="text-lg text-slate-700">Not reviewed. A day can be starred within a week.</p>
      </li>
    </ul>
  </section>
</template>
