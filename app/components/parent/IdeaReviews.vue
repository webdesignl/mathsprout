<script setup lang="ts">
import { useChildStore } from '../../stores/child'
import { groupIdeas, type IdeaRow } from '../../utils/ideas'

const client = useSupabaseClient()
const childStore = useChildStore()
/** Shared with the header badge. */
const pendingCount = useState<number>('pending-ideas', () => 0)

const rows = ref<IdeaRow[]>([])
const message = ref('')
const groups = computed(() => groupIdeas(rows.value))

function who(childId: string) {
  return childStore.children.find((c) => c.id === childId)?.nickname ?? 'Child'
}

async function load() {
  const { data, error } = await client
    .from('ideas')
    .select('id, child_id, set_number, text, approved')
    .order('created_at', { ascending: false })
  if (error || !data) {
    message.value = 'Could not load ideas.'
    return
  }
  rows.value = data
  pendingCount.value = groupIdeas(data).pending.length
}
onMounted(load)

/** The database refuses this if parent mode has ended, so a failure here is shown, never hidden. */
async function review(id: string, approved: boolean | null) {
  message.value = ''
  const { error } = await client.rpc('give_star', { idea_id: id, approved: approved as boolean })
  if (error) message.value = 'Could not save. Is parent mode still on?'
  else await load()
}

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-lg font-bold'
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <h2 class="text-2xl font-bold">Real-life ideas</h2>
      <p class="text-xl text-slate-900">
        Your child shared real-life uses for fractions. Give a star for each idea that makes sense.
      </p>
    </div>
    <p v-if="message" role="alert" class="text-lg font-semibold text-red-800">{{ message }}</p>

    <p v-if="rows.length === 0" class="rounded-2xl bg-white p-5 text-xl text-slate-900">
      Nothing to review yet. Ideas show up here after your child finishes a set.
    </p>

    <section v-if="groups.pending.length" aria-labelledby="to-review" class="space-y-3">
      <h3 id="to-review" class="text-2xl font-bold">To review ({{ groups.pending.length }})</h3>
      <ul class="space-y-3">
        <li v-for="idea in groups.pending" :key="idea.id" class="space-y-3 rounded-2xl bg-white p-5">
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

    <section v-if="groups.reviewed.length" aria-labelledby="done" class="space-y-3">
      <h3 id="done" class="text-2xl font-bold">
        Reviewed ({{ groups.reviewed.length }}) · {{ groups.stars }} {{ groups.stars === 1 ? 'star' : 'stars' }} given
      </h3>
      <ul class="space-y-3">
        <li
          v-for="idea in groups.reviewed"
          :key="idea.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5"
        >
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
              type="button"
              :class="[button, 'bg-white text-emerald-900 ring-2 ring-emerald-700 hover:bg-emerald-50']"
              :aria-label="`${idea.approved ? 'Take back the star' : 'Give a star'} for: ${idea.text}`"
              @click="review(idea.id, !idea.approved)"
            >
              {{ idea.approved ? 'Take back' : 'Give a star' }}
            </button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
