<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useChildStore } from '../stores/child'
import PinPad from '../components/parent/PinPad.vue'
import FamilyManager from '../components/parent/FamilyManager.vue'
import ParentTodayPlan from '../components/parent/TodayPlan.vue'
import TemplateManager from '../components/parent/TemplateManager.vue'
import AddTask from '../components/parent/AddTask.vue'
import ProgressSummary from '../components/parent/ProgressSummary.vue'
import BacklogList from '../components/parent/BacklogList.vue'
import HistoryList from '../components/parent/HistoryList.vue'
import { daysBetween, todayString } from '../utils/todayPlan'
import { avatarOf } from '../utils/avatars'
import IdeaReviews from '../components/parent/IdeaReviews.vue'

useHead({ title: 'Parent · MathSprout' })

const childStore = useChildStore()
const client = useSupabaseClient()
const parent = useParentMode()

const pinError = ref('')
const pinBusy = ref(false)
/** First PIN typed while choosing a new one; it is compared with the second and then dropped. */
const firstPin = ref<string | null>(null)
const resetting = ref(false)

onMounted(async () => {
  await parent.refresh()
  if (parent.unlocked.value) await checkForgotten()
})
watch(() => parent.unlocked.value, (on) => on && checkForgotten())
onBeforeUnmount(() => parent.stopTimer())

const pinTitle = computed(() => {
  if (parent.hasPin.value) return resetting.value ? (firstPin.value ? 'Type the new PIN again' : 'Choose a new PIN') : 'Enter your parent PIN'
  return firstPin.value ? 'Type the PIN again to confirm' : 'Choose a parent PIN (4 to 6 numbers)'
})

const countdown = computed(() => {
  const s = parent.secondsLeft.value
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})

async function onPin(pin: string) {
  pinError.value = ''
  const choosing = !parent.hasPin.value || resetting.value
  if (choosing) {
    if (firstPin.value === null) {
      firstPin.value = pin
      return
    }
    const same = firstPin.value === pin
    firstPin.value = null
    if (!same) {
      pinError.value = 'The two PINs were different. Try again.'
      return
    }
    pinBusy.value = true
    const result = parent.hasPin.value ? await parent.resetPin(pin) : await parent.setPin(pin)
    pinBusy.value = false
    if (!result.ok) pinError.value = result.error
    else resetting.value = false
    return
  }
  pinBusy.value = true
  const result = await parent.unlock(pin)
  pinBusy.value = false
  if (!result.ok) pinError.value = result.error
}

async function signOut() {
  await parent.lock()
  childStore.select(null)
  await client.auth.signOut()
  await navigateTo('/login')
}

const route = useRoute()
const unseenTasks = useState<number>('unseen-tasks', () => 0)
const unseenCompletions = useState<number>('unseen-completions', () => 0)
const pendingIdeas = useState<number>('pending-ideas', () => 0)
const backlogCount = useState<number>('backlog-count', () => 0)
const historyUnseen = useState<number>('history-unseen', () => 0)
/** Finished days still waiting for a star or "seen" after 5 days: remind before the one-week limit. */
const forgotStars = ref(false)

async function checkForgotten() {
  const { data } = await client.from('day_summaries').select('summary_date').eq('finished_all', true).eq('seen', false)
  const today = todayString()
  historyUnseen.value = data?.length ?? 0
  forgotStars.value = (data ?? []).some((r) => daysBetween(r.summary_date, today) >= 5 && daysBetween(r.summary_date, today) <= 7)
}

const sections = computed(() => [
  { id: 'plan', label: 'Prioritise tasks', badge: unseenTasks.value + unseenCompletions.value, needsChild: true },
  { id: 'add', label: 'Add new task', badge: 0, needsChild: true },
  { id: 'backlog', label: 'Backlog', badge: backlogCount.value, needsChild: true },
  { id: 'history', label: 'History', badge: historyUnseen.value, needsChild: false },
  { id: 'progress', label: 'Progress', badge: 0, needsChild: false },
  { id: 'ideas', label: 'Real-life examples', badge: pendingIdeas.value, needsChild: false },
  { id: 'family', label: 'Family account', badge: 0, needsChild: false },
])
/** The open section is kept in the address (?tab=), so a reload or a link lands on the same one. */
const tab = computed(() => sections.value.find((x) => x.id === route.query.tab)?.id ?? 'plan')
const current = computed(() => sections.value.find((x) => x.id === tab.value)!)
function go(id: string) {
  void navigateTo({ path: '/parent', query: { tab: id } }, { replace: true })
}

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-lg font-bold'
</script>

<template>
  <div v-if="parent.hasPin.value === null" class="mx-auto max-w-3xl">
    <p role="status" class="text-xl text-slate-900">Loading…</p>
  </div>
  <div v-else-if="!parent.unlocked.value" class="mx-auto max-w-3xl space-y-4">
    <PinPad :title="pinTitle" :error="pinError" :busy="pinBusy" @submit="onPin" />
    <div v-if="parent.hasPin.value === true" class="mx-auto max-w-xs space-y-2 text-center text-lg text-slate-700">
      <p>Forgot it? Sign out and sign in again, then tap Reset PIN within 10 minutes.</p>
      <button type="button" class="min-h-12 font-semibold text-emerald-900 underline" @click="resetting = !resetting; firstPin = null; pinError = ''">
        {{ resetting ? 'Back to entering my PIN' : 'Reset PIN' }}
      </button>
    </div>
    <div class="text-center">
      <button type="button" class="min-h-12 text-lg font-semibold text-emerald-900 underline" @click="signOut">Sign out</button>
    </div>
  </div>
  <div v-else class="mx-auto max-w-5xl space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-3xl font-bold text-emerald-900">Parent</h1>
      <div class="flex flex-wrap items-center gap-3">
        <p class="text-lg text-slate-700" role="timer">Unlocked · {{ countdown }} left</p>
        <button type="button" :class="[button, 'bg-white text-slate-900 ring-2 ring-slate-600']" @click="parent.lock()">Lock now</button>
      </div>
    </div>

    <div class="grid gap-5 md:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label="Parent sections" class="md:sticky md:top-4 md:self-start">
        <ul class="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          <li v-for="item in sections" :key="item.id" class="shrink-0">
            <button
              type="button"
              class="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-lg font-semibold"
              :class="tab === item.id ? 'bg-emerald-700 text-white' : 'bg-white text-slate-900 ring-2 ring-slate-300 hover:bg-emerald-50'"
              :aria-current="tab === item.id ? 'page' : undefined"
              @click="go(item.id)"
            >
              <span class="whitespace-nowrap">{{ item.label }}</span>
              <span
                v-if="item.badge > 0"
                class="rounded-full bg-amber-200 px-2 py-0.5 text-sm font-bold text-amber-950"
                :aria-label="`${item.badge} new`"
              >{{ item.badge }}</span>
            </button>
          </li>
        </ul>
      </nav>

      <div class="min-w-0 space-y-4">
        <div v-if="current.needsChild && childStore.children.length > 1" role="group" aria-label="Choose a child" class="flex flex-wrap items-center gap-2">
          <span class="text-lg font-semibold text-slate-900">For:</span>
          <button
            v-for="c in childStore.children"
            :key="c.id"
            type="button"
            :aria-pressed="childStore.selectedId === c.id"
            class="min-h-12 rounded-xl px-4 text-lg font-bold"
            :class="childStore.selectedId === c.id ? 'bg-emerald-700 text-white' : 'bg-white text-slate-900 ring-2 ring-slate-600'"
            @click="childStore.select(c.id)"
          >
            <span aria-hidden="true" class="mr-1">{{ avatarOf(c.avatar) }}</span>{{ c.nickname }}
          </button>
        </div>

        <p v-if="forgotStars" role="status" class="rounded-2xl bg-amber-100 p-4 text-lg font-semibold text-amber-950">
          Forgot to give this week’s Task done stars?!
          <button type="button" class="ml-2 min-h-12 underline" @click="go('history')">Open History</button>
        </p>

        <ParentTodayPlan v-if="tab === 'plan'" />
        <template v-else-if="tab === 'add'">
          <AddTask />
          <TemplateManager />
        </template>
        <BacklogList v-else-if="tab === 'backlog'" />
        <HistoryList v-else-if="tab === 'history'" />
        <ProgressSummary v-else-if="tab === 'progress'" />
        <IdeaReviews v-else-if="tab === 'ideas'" />
        <FamilyManager v-else @signout="signOut" />
      </div>
    </div>
  </div>
</template>
