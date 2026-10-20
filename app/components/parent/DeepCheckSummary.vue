<script setup lang="ts">
import { RULES } from '../../data/deepCheck'
import { MASTERED_STARS, deepCheckProgress, type AttemptLine } from '../../utils/deepCheck'

const props = defineProps<{ childId: string }>()
const client = useSupabaseClient()
const lines = ref<AttemptLine[]>([])
const failed = ref(false)

async function load() {
  failed.value = false
  const { data, error } = await client
    .from('attempts')
    .select('mode, problem, correct')
    .eq('child_id', props.childId)
    .eq('mode', 'deep_check')
    .order('created_at', { ascending: false })
    .limit(400)
  if (error || !data) {
    failed.value = true
    return
  }
  lines.value = data as AttemptLine[]
}
onMounted(load)
watch(() => props.childId, load)

const progress = computed(() => deepCheckProgress(lines.value))
const tried = computed(() => RULES.filter((r) => progress.value[r.id]!.tried > 0))
const mastered = computed(() => RULES.filter((r) => progress.value[r.id]!.stars === MASTERED_STARS))
/** A rule she has tried a few times but has not shown in most question types yet. */
const lookAgain = computed(() => tried.value.filter((r) => progress.value[r.id]!.tried >= 3 && progress.value[r.id]!.stars <= 2))
</script>

<template>
  <section :aria-label="`Understanding quizzes`" class="space-y-2">
    <h4 class="text-lg font-semibold text-emerald-900">Understanding (Deep Check)</h4>
    <p v-if="failed" role="alert" class="text-lg text-red-800">Could not load the quizzes.</p>
    <p v-else-if="tried.length === 0" class="text-lg text-slate-700">No quizzes yet.</p>
    <template v-else>
      <p class="text-lg text-slate-900">
        {{ mastered.length }} of {{ RULES.length }} rules mastered. A rule is mastered when all 5 question types have been answered right.
      </p>
      <ul class="space-y-1 text-lg text-slate-900">
        <li v-for="r in tried" :key="r.id" class="flex flex-wrap items-baseline gap-x-2">
          <span class="font-semibold">{{ r.id }} {{ r.title }}:</span>
          <span class="text-amber-900" :aria-label="`${progress[r.id]!.stars} of ${MASTERED_STARS} stars`" aria-hidden="false">
            {{ '★'.repeat(progress[r.id]!.stars) }}{{ '☆'.repeat(MASTERED_STARS - progress[r.id]!.stars) }}
          </span>
          <span class="text-slate-700">{{ progress[r.id]!.right }} right of {{ progress[r.id]!.tried }}</span>
        </li>
      </ul>
      <p v-if="lookAgain.length" class="text-lg text-slate-900">
        <span class="font-semibold">Worth another look:</span> {{ lookAgain.map((r) => r.title).join(', ') }}
      </p>
    </template>
  </section>
</template>
