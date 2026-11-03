<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTutorStore } from '../../stores/tutor'
import { buildBarStages, stageAt } from '../../utils/fractionBar'
import { buildRatePlan } from '../../utils/rateBar'
import { buildSpacingPlan } from '../../utils/spacing'
import { buildUnitPlan } from '../../utils/unitBar'
import { createTutorApi } from '../../utils/tutorApi'
import type { Plan } from '../../utils/plan'

// A developer tool: it only exists while developing (see nuxt.config.ts, which drops every /dev route
// from production builds). This check is a second lock.
if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Page Not Found', fatal: true })
}

useHead({ title: 'Word-problem models · MathSprout', meta: [{ name: 'robots', content: 'noindex' }] })

interface Sample {
  id: string
  title: string
  story: string
  plan: Plan
  stages: ReturnType<typeof buildBarStages>
  /** Things-in-a-row problems draw a number line instead of a bar. */
  line?: NonNullable<ReturnType<typeof buildSpacingPlan>>
}

/** Original problems for each type, so the pictures can be checked without the AI. */
const STORY = {
  rest: 'A library has some books. 3/4 of them are story books. 1/3 of the books that are not story books are about animals. What fraction of all the books are about animals?',
  unit: 'Mia spent 1/3 of her savings on a bike. Of what was left she spent 1/4 on books and 1/8 on snacks. She had $60 left. How much were her savings at first?',
  frame: 'Three paintings hang in a row on a wall 10 1/4 feet wide. Each painting is 2 feet wide. There is a margin of 1/2 foot at each end of the wall. How much equal space is there between the paintings?',
  spacing: 'Lanterns hang in a row with the same gap between each. The 2nd lantern to the 5th lantern is 2 1/4 m apart. The 2nd lantern to the last lantern is 12 3/4 m. Which number lantern is the last one?',
  rate: 'A battery runs a lamp the same number of hours each day. 3/4 of the charge is left after 4 days. After 3 more days, 2 1/2 hours of light are left. How many hours of light did the full battery give?',
}

const restPlan: Plan = {
  whole: 'the books',
  steps: [
    { op: 'subtract', a: '1', b: '3/4', label: 'What fraction of the books are not story books?', bName: 'story books', name: 'not story books' },
    { op: 'multiply', a: 'r1', b: '1/3', label: 'What fraction of all the books are about animals?', name: 'about animals' },
  ],
}
const unit = buildUnitPlan(
  {
    groups: [{ takes: [{ share: '1/3', name: 'bike' }] }, { takes: [{ share: '1/4', name: 'books' }, { share: '1/8', name: 'snacks' }] }],
    left: { amount: '60', unit: '$', name: 'kept' },
  },
  'her savings',
)!
const rate = buildRatePlan({ first: { days: '4', left: '3/4' }, second: { days: '3', amountLeft: '2 1/2' }, unit: 'hours' }, 'the battery')!

const spacing = buildSpacingPlan({ thing: 'lantern', unit: 'm', near: { from: '2', to: '5', distance: '2 1/4' }, far: { from: '2', distance: '12 3/4' } })!

const frame = buildSpacingPlan({ thing: 'painting', unit: 'feet', count: '3', total: '10 1/4', edge: '1/2', size: '2' })!

const samples: Sample[] = [
  { id: 'rest', title: 'Part of the rest', story: STORY.rest, plan: restPlan, stages: buildBarStages(restPlan) },
  { id: 'unit', title: 'Work backwards (unit bar)', story: STORY.unit, plan: unit.plan, stages: unit.stages },
  { id: 'rate', title: 'Same amount each day (day strip)', story: STORY.rate, plan: rate.plan, stages: rate.stages },
  { id: 'spacing', title: 'Things in a row (number line)', story: STORY.spacing, plan: spacing.plan, stages: null, line: spacing },
  { id: 'frame', title: 'Margins and widths (row)', story: STORY.frame, plan: frame.plan, stages: null, line: frame },
]

const which = ref('rest')
const sample = computed(() => samples.find((s) => s.id === which.value)!)
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
        v-for="s in samples"
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
      <TutorSpacingPicture v-if="sample.line" :built="sample.line" :done="step + 1" />
      <TutorFractionBar v-else-if="stage" :stage="stage" :replay="replay" :still="stage.step !== step" />
      <p v-else class="text-base text-slate-700">No picture yet at this step (it appears after a later step).</p>
      <p v-if="!sample.stages && !sample.line" class="text-base font-semibold text-red-800">This sample has no picture, which is a bug.</p>
    </section>

    <section class="space-y-2">
      <button type="button" :class="button" @click="useInTutor">Use this sample in the Tutor</button>
      <p v-if="loaded" class="text-base text-slate-800" role="status">
        Loaded “{{ loaded }}”. Now open <NuxtLink to="/tutor" class="font-semibold underline">the Tutor</NuxtLink>, tap Type it, type anything and tap Read it.
      </p>
    </section>
  </div>
</template>
