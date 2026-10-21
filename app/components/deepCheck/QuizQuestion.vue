<script setup lang="ts">
import type { AsnAnswer, Item } from '../../data/deepCheck'
import type { BarState, Grade } from '../../utils/deepCheck'
import type { Feedback } from '../../stores/deepCheck'

const props = defineProps<{ item: Item; feedback: Feedback | null }>()
const emit = defineEmits<{
  asn: [answer: AsnAnswer]
  choice: [index: number]
  reverse: [text: string]
  draw: [state: BarState]
}>()

const locked = computed(() => props.feedback !== null)
const picked = ref<number | AsnAnswer | null>(null)
const text = ref('')
const problem = ref('')

/** The grade of a typed answer: an unreadable one stays on the screen with a message. */
function sendReverse() {
  problem.value = ''
  emit('reverse', text.value)
}
defineExpose({
  showProblem(grade: Grade) {
    problem.value = grade.status === 'invalid' ? grade.message : ''
  },
})

const asnOptions: { value: AsnAnswer; label: string }[] = [
  { value: 'always', label: 'Always' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'never', label: 'Never' },
]

const option = 'flex min-h-14 w-full items-center gap-3 rounded-xl px-4 text-left text-lg font-semibold ring-2'
function optionClass(chosen: boolean, isAnswer: boolean) {
  if (!locked.value) return 'bg-white text-slate-900 ring-slate-500 hover:bg-emerald-50'
  if (isAnswer) return 'bg-emerald-100 text-emerald-950 ring-emerald-600'
  if (chosen) return 'bg-rose-50 text-rose-950 ring-rose-500'
  return 'bg-white text-slate-700 ring-slate-300'
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-xl font-semibold text-slate-900">{{ item.prompt }}</p>

    <!-- Always, sometimes, never -->
    <div v-if="item.type === 'asn'" class="grid gap-3 sm:grid-cols-3" role="group" aria-label="Choose one">
      <button
        v-for="o in asnOptions"
        :key="o.value"
        type="button"
        :disabled="locked"
        :class="[option, 'justify-center', optionClass(picked === o.value, item.answer === o.value)]"
        @click="picked = o.value; emit('asn', o.value)"
      >
        {{ o.label }}
      </button>
    </div>

    <!-- Spot the mistake and Which doesn't belong -->
    <ul v-else-if="item.type === 'spotMistake' || item.type === 'oddOneOut'" class="space-y-3">
      <li v-for="(o, i) in item.options" :key="i">
        <button
          type="button"
          :disabled="locked"
          :class="[option, optionClass(picked === i, item.answer === i)]"
          @click="picked = i; emit('choice', i)"
        >
          <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base font-bold text-slate-900" aria-hidden="true">{{ 'ABCD'[i] }}</span>
          {{ o }}
          <span v-if="locked && item.answer === i" class="sr-only">(the right answer)</span>
        </button>
      </li>
    </ul>

    <!-- Reverse it -->
    <form v-else-if="item.type === 'reverse'" class="space-y-3" @submit.prevent="sendReverse">
      <label class="block space-y-1 text-lg font-semibold text-slate-900">
        Your answer
        <span :id="`format-${item.id}`" class="block text-base font-normal text-slate-700">{{ item.format }}</span>
        <input
          v-model="text"
          :disabled="locked"
          autocomplete="off"
          :aria-describedby="`format-${item.id}`"
          class="block min-h-12 w-full max-w-sm rounded-xl border-2 border-slate-600 bg-white px-4 text-xl text-slate-900"
        >
      </label>
      <p v-if="problem" role="alert" class="text-base font-semibold text-red-800">{{ problem }}</p>
      <button type="submit" :disabled="locked" class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-6 text-lg font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
        Check
      </button>
    </form>

    <!-- Draw it -->
    <DeepCheckBarBuilder v-else :start="item.start" :dens="item.dens" :locked="locked" @submit="emit('draw', $event)" />
  </div>
</template>
