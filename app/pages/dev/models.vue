<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTutorStore } from '../../stores/tutor'
import { stageAt } from '../../utils/fractionBar'
import { SAMPLES } from '../../utils/modelSamples'
import { createTutorApi } from '../../utils/tutorApi'

// A developer tool: it only exists while developing (see nuxt.config.ts, which drops every /dev route
// from production builds). This check is a second lock.
if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Page Not Found', fatal: true })
}

useHead({ title: 'Word-problem models · MathSprout', meta: [{ name: 'robots', content: 'noindex' }] })

const which = ref('rest')
const sample = computed(() => SAMPLES.find((s) => s.id === which.value)!)
const step = ref(0)
const replay = ref(0)
const stage = computed(() => (sample.value.stages ? stageAt(sample.value.stages, step.value) : null))

function pick(id: string) {
  which.value = id
  step.value = 0
  replay.value++
}
function go(by: number) {
  step.value = Math.min(Math.max(step.value + by, 0), sample.value.plan.steps.length - 1)
  replay.value++
}

/** "Use in the Tutor": the Tutor's reader returns this sample, so Type it, Read it starts the real flow. */
const tutor = useTutorStore()
const loaded = ref('')
function useInTutor() {
  const plan = sample.value.plan
  const real = createTutorApi((url, body) => (globalThis as unknown as { $fetch: (u: string, o: unknown) => Promise<unknown> }).$fetch(url, { method: 'POST', body }))
  tutor.setApi({
    ...real,
    read: async () => ({ ok: true, plan, problemText: sample.value.story, confidence: 'high' }),
  })
  loaded.value = sample.value.title
}

const button =
  'inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-base font-bold bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100 disabled:opacity-50'
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <h1 class="text-3xl font-bold text-emerald-900">Word-problem models</h1>
    <p class="text-lg text-slate-800">Developer preview. Pick a type, step through it, or load it into the Tutor with no AI.</p>

    <div class="flex flex-wrap gap-2" role="group" aria-label="Problem type">
      <button
        v-for="s in SAMPLES"
        :key="s.id"
        type="button"
        :aria-pressed="which === s.id"
        :class="['inline-flex min-h-11 items-center rounded-xl px-4 text-base font-bold', which === s.id ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-900 ring-2 ring-emerald-700']"
        @click="pick(s.id)"
      >
        {{ s.title }}
      </button>
    </div>

    <p class="rounded-2xl bg-white p-4 text-lg text-slate-900 shadow-sm">{{ sample.story }}</p>

    <section class="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" :class="button" :disabled="step === 0" @click="go(-1)">Previous step</button>
        <button type="button" :class="button" :disabled="step >= sample.plan.steps.length - 1" @click="go(1)">Next step</button>
        <button type="button" :class="button" @click="replay++">Replay</button>
        <span class="text-base font-semibold text-slate-800">Answered through step {{ step + 1 }} of {{ sample.plan.steps.length }}</span>
      </div>
      <p class="text-base text-slate-700">Step {{ step + 1 }}: {{ sample.plan.steps[step]!.label }}</p>
      <TutorFractionBar v-if="stage" :stage="stage" :replay="replay" :still="stage.step !== step" />
      <p v-else class="text-base text-slate-700">No picture yet at this step (it appears after a later step).</p>
      <p v-if="!sample.stages" class="text-base font-semibold text-red-800">This sample has no picture, which is a bug.</p>
    </section>

    <section class="space-y-2">
      <button type="button" :class="button" @click="useInTutor">Use this sample in the Tutor</button>
      <p v-if="loaded" class="text-base text-slate-800" role="status">
        Loaded “{{ loaded }}”. Now open <NuxtLink to="/tutor" class="font-semibold underline">the Tutor</NuxtLink>, tap Type it, type anything and tap Read it.
      </p>
    </section>
  </div>
</template>
