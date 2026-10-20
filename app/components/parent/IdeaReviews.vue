<script setup lang="ts">
import { useChildStore } from '../../stores/child'
import { canChangeReview, groupIdeas, recentReviewed, type IdeaRow } from '../../utils/ideas'

const client = useSupabaseClient()
const childStore = useChildStore()
/** Shared with the header badge. */
const pendingCount = useState<number>('pending-ideas', () => 0)

const rows = ref<IdeaRow[]>([])
const starsGiven = ref<number | null>(null)
const message = ref('')
const pending = computed(() => groupIdeas(rows.value).pending)
const recent = computed(() => recentReviewed(rows.value))

function who(childId: string) {
  return childStore.children.find((c) => c.id === childId)?.nickname ?? 'Child'
}

async function load() {
  const [ideas, stars] = await Promise.all([
    client.from('ideas').select('id, child_id, set_number, text, approved, reviewed_at, created_at').order('created_at', { ascending: false }),
    // The ledger counts every star a parent gave, even for ideas that were deleted later.
    client.from('awards').select('id', { count: 'exact', head: true }).in('kind', ['idea_star', 'day_done']),
  ])
  if (ideas.error || !ideas.data) {
    message.value = 'Could not load ideas.'
    return
  }
  rows.value = ideas.data
  pendingCount.value = groupIdeas(ideas.data).pending.length
  starsGiven.value = stars.error ? null : (stars.count ?? 0)
}
onMounted(load)

/** The database refuses this if parent mode ended, or if the review is more than a week old. */
async function review(id: string, approved: boolean | null) {
  message.value = ''
  const { error } = await client.rpc('give_star', { idea_id: id, approved: approved as boolean })
  if (error) {
    message.value = /week/i.test(error.message) ? 'Reviews are final after a week.' : 'Could not save. Is parent mode still on?'
  } else {
    await load()
  }
}

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-lg font-bold'
</script>

<template>
  <div class="space-y-5">
    <div class="space-y-1">
      <h2 class="text-2xl font-bold">Real-life examples</h2>
      <p v-if="starsGiven !== null" class="text-xl text-slate-900">
        <span aria-hidden="true">⭐</span> {{ starsGiven }} {{ starsGiven === 1 ? 'star' : 'stars' }} given so far
      </p>
      <p class="text-lg text-slate-700">Stars stay for good. After a week, a review is final.</p>
    </div>
    <p v-if="message" role="alert" class="text-lg font-semibold text-red-800">{{ message }}</p>

    <p v-if="pending.length === 0 && recent.length === 0" class="rounded-2xl bg-white p-5 text-xl text-slate-900">
      Nothing yet. Ideas appear after a set.
    </p>

    <section v-if="pending.length" aria-labelledby="to-review" class="space-y-3">
      <h3 id="to-review" class="text-xl font-bold">To review ({{ pending.length }})</h3>
      <ul class="space-y-3">
        <li v-for="idea in pending" :key="idea.id" class="space-y-3 rounded-2xl bg-white p-5">
          <p class="text-lg text-slate-700">{{ who(idea.child_id) }} · Set {{ idea.set_number }}</p>
          <p class="text-2xl text-slate-900">{{ idea.text }}</p>
          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800']"
              :aria-label="`Give a star for: ${idea.text}`"
              @click="review(idea.id, true)"
            >
              <span aria-hidden="true">⭐</span>&nbsp;Give a star
            </button>
            <button
              type="button"
              :class="[button, 'bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100']"
              :aria-label="`No star this time for: ${idea.text}`"
              @click="review(idea.id, false)"
            >
              Not this time
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="recent.length" aria-labelledby="recent" class="space-y-3">
      <h3 id="recent" class="text-xl font-bold">Recent</h3>
      <ul class="space-y-3">
        <li v-for="idea in recent" :key="idea.id" class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5">
          <div>
            <p class="text-lg text-slate-700">{{ who(idea.child_id) }} · Set {{ idea.set_number }}</p>
            <p class="text-xl text-slate-900">{{ idea.text }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-lg font-semibold" :class="idea.approved ? 'text-amber-900' : 'text-slate-700'">
              <span v-if="idea.approved"><span aria-hidden="true">⭐</span> Star given</span>
              <span v-else>No star</span>
            </span>
            <button
              v-if="canChangeReview(idea.reviewed_at)"
              type="button"
              :class="[button, 'bg-white text-emerald-900 ring-2 ring-emerald-700 hover:bg-emerald-50']"
              :aria-label="`${idea.approved ? 'Take back the star' : 'Give a star'} for: ${idea.text}`"
              @click="review(idea.id, !idea.approved)"
            >
              {{ idea.approved ? 'Take back' : 'Give a star' }}
            </button>
            <span v-else class="text-lg text-slate-700">Final</span>
          </div>
        </li>
      </ul>
      <p class="text-base text-slate-700">Only the 3 newest reviewed ideas are kept. Older ones are deleted; their stars stay.</p>
    </section>
  </div>
</template>
