<script setup lang="ts">
import { summarize, type AttemptLine, type Summary } from '../../utils/summary'

const props = defineProps<{ childId: string; nickname: string }>()
const client = useSupabaseClient()
const summary = ref<Summary | null>(null)
const failed = ref(false)

async function load() {
  failed.value = false
  const { data, error } = await client
    .from('attempts')
    .select('mode, problem, correct, first_try, hints_used, error_type')
    .eq('child_id', props.childId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error || !data) {
    failed.value = true
    return
  }
  summary.value = summarize(data as AttemptLine[])
}
onMounted(load)
watch(() => props.childId, load)

function list(items: string[]) {
  return items.join(', ')
}
</script>

<template>
  <section :aria-label="`Summary for ${nickname}`" class="space-y-2">
    <h4 class="text-lg font-semibold text-emerald-900">Last 20 problems</h4>
    <p v-if="failed" role="alert" class="text-lg text-red-800">Could not load the summary.</p>
    <p v-else-if="summary && summary.total === 0" class="text-lg text-slate-700">No problems yet.</p>
    <dl v-else-if="summary" class="space-y-1 text-lg text-slate-900">
      <div class="flex flex-wrap gap-x-2">
        <dt class="font-semibold">Done:</dt>
        <dd>{{ summary.total }}, {{ summary.smooth }} smooth</dd>
      </div>
      <div class="flex flex-wrap gap-x-2">
        <dt class="font-semibold">Struggled:</dt>
        <dd>{{ summary.struggled }} needed help</dd>
      </div>
      <div class="flex flex-wrap gap-x-2">
        <dt class="font-semibold">Tutor help:</dt>
        <dd>{{ summary.tutor }} {{ summary.tutor === 1 ? 'problem' : 'problems' }}</dd>
      </div>
      <div class="flex flex-wrap gap-x-2">
        <dt class="font-semibold">Rules mastered:</dt>
        <dd>{{ summary.mastered.length ? list(summary.mastered) : 'None yet.' }}</dd>
      </div>
      <div v-if="summary.needsPractice.length" class="flex flex-wrap gap-x-2">
        <dt class="font-semibold">Needs practice:</dt>
        <dd>{{ list(summary.needsPractice) }}</dd>
      </div>
      <div class="flex flex-wrap gap-x-2">
        <dt class="font-semibold">Mistake patterns:</dt>
        <dd>
          <template v-if="summary.patterns.length">
            <span v-for="(p, i) in summary.patterns" :key="p.text">{{ i ? '; ' : '' }}{{ p.text }} ({{ p.count }})</span>
          </template>
          <template v-else>None.</template>
        </dd>
      </div>
    </dl>
  </section>
</template>
