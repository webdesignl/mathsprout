<script setup lang="ts">
import type { Challenge } from '../../data/deepCheck'
import type { ChallengeGrade } from '../../utils/deepCheck'

const props = defineProps<{ challenge: Challenge; result: ChallengeGrade | null }>()
const emit = defineEmits<{ submit: [values: Record<string, string | number>, hintsUsed: number]; again: []; back: [] }>()

const values = reactive<Record<string, string | number>>({})
const hintsShown = ref(0)
const showWork = ref(false)

const solved = computed(() => props.result?.readable === true && props.result.correct)
const hints = computed(() => props.challenge.hints.slice(0, hintsShown.value))
const moreHints = computed(() => hintsShown.value < props.challenge.hints.length)

function send() {
  emit('submit', { ...values }, hintsShown.value)
}

const input = 'block min-h-12 w-full max-w-xs rounded-xl border-2 border-slate-600 bg-white px-4 text-xl text-slate-900'
const outline = (field: string) => {
  const g = props.result?.fields[field]
  return g?.status === 'correct' ? 'border-emerald-600' : g?.status === 'wrong' ? 'border-rose-600' : ''
}
</script>

<template>
  <section class="space-y-5" :aria-labelledby="`challenge-${challenge.id}`">
    <div class="space-y-1">
      <p class="text-base font-semibold text-emerald-800">Olympiad challenge · {{ challenge.id }}</p>
      <h2 :id="`challenge-${challenge.id}`" class="text-3xl font-bold text-emerald-900">{{ challenge.title }}</h2>
    </div>

    <p class="rounded-2xl bg-white p-4 text-xl text-slate-900 ring-1 ring-slate-200">{{ challenge.story }}</p>

    <!-- Hints, one at a time -->
    <div class="space-y-3">
      <div v-for="(hint, i) in hints" :key="i" class="space-y-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
        <p class="text-lg text-amber-950"><span class="font-semibold">Hint {{ i + 1 }}:</span> {{ hint }}</p>
        <div v-if="i === 0 && challenge.picture && challenge.picture.kind === 'area'" class="rounded-xl bg-white p-3">
          <DeepCheckAreaModel
            :cols="challenge.picture.cols"
            :rows="challenge.picture.rows"
            :a="challenge.picture.a"
            :b="challenge.picture.b"
            :a-label="challenge.picture.aLabel"
            :b-label="challenge.picture.bLabel"
            :both-label="challenge.picture.bothLabel"
          />
        </div>
      </div>
      <button
        v-if="moreHints && !solved"
        type="button"
        class="inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100"
        @click="hintsShown += 1"
      >
        {{ hintsShown === 0 ? 'Need a hint?' : 'One more hint' }}
      </button>
    </div>

    <!-- Answers -->
    <form class="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5" @submit.prevent="send">
      <div v-for="field in challenge.fields" :key="field.id" class="space-y-1">
        <template v-if="field.kind === 'number'">
          <label :for="`f-${field.id}`" class="block text-lg font-semibold text-slate-900">{{ field.label }}</label>
          <input
            :id="`f-${field.id}`"
            v-model="values[field.id]"
            :disabled="solved"
            autocomplete="off"
            :placeholder="field.placeholder"
            :class="[input, 'border-2', outline(field.id)]"
          >
        </template>
        <fieldset v-else class="space-y-1">
          <legend class="text-lg font-semibold text-slate-900">{{ field.label }}</legend>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(o, i) in field.options"
              :key="o"
              type="button"
              :disabled="solved"
              :aria-pressed="values[field.id] === i"
              class="min-h-12 rounded-xl px-5 text-lg font-bold ring-2"
              :class="values[field.id] === i ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-white text-slate-900 ring-slate-500'"
              @click="values[field.id] = i"
            >
              {{ o }}
            </button>
          </div>
        </fieldset>
        <p v-if="result?.fields[field.id]?.status === 'correct'" class="text-base font-semibold text-emerald-800"><span aria-hidden="true">✓</span> Right</p>
        <p v-else-if="result?.fields[field.id]?.status === 'wrong'" class="text-base font-semibold text-rose-800" role="alert">
          <span aria-hidden="true">✗</span> Not yet. {{ (result.fields[field.id] as { message?: string }).message ?? '' }}
        </p>
        <p v-else-if="result?.fields[field.id]?.status === 'invalid'" class="text-base font-semibold text-red-800" role="alert">
          {{ (result.fields[field.id] as { message: string }).message }}
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <button
          v-if="!solved && !(result && result.readable)"
          type="submit"
          class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-6 text-lg font-bold text-white hover:bg-emerald-800"
        >
          Check my answer
        </button>
        <button
          v-if="result && result.readable && !solved"
          type="button"
          class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-6 text-lg font-bold text-white hover:bg-emerald-800"
          @click="emit('again')"
        >
          Try again
        </button>
        <button
          v-if="!solved && !showWork && result && result.readable"
          type="button"
          class="inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100"
          @click="showWork = true"
        >
          Show me the working
        </button>
      </div>
    </form>

    <div v-if="solved" role="status" class="rounded-2xl bg-emerald-50 p-4 ring-2 ring-emerald-500">
      <p class="text-xl font-bold text-emerald-900">Solved! Great thinking.</p>
      <p class="mt-1 text-lg text-slate-900">{{ challenge.explanation }}</p>
    </div>
    <div v-else-if="showWork" class="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-300">
      <p class="text-lg font-semibold text-amber-950">The working</p>
      <p class="mt-1 text-lg text-slate-900">{{ challenge.explanation }}</p>
    </div>

    <button type="button" class="inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100" @click="emit('back')">
      Back to rules
    </button>
  </section>
</template>
