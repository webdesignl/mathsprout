<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useTutorStore } from '../stores/tutor'
import { boxesToText, isAnswerEmpty, isFractionIncomplete, type AnswerBoxes } from '../utils/answer'
import { slipName } from '../utils/messages'
import { resizePhoto } from '../utils/image'
import { opSymbol, type AnyOp } from '../utils/fraction'
import { useScratchStore } from '../stores/scratch'
import { buildBarStages, stageAt } from '../utils/fractionBar'
import { buildUnitPlan } from '../utils/unitBar'
import { buildRatePlan } from '../utils/rateBar'
import { buildSpacingPlan } from '../utils/spacing'

useHead({ title: 'Tutor · MathSprout' })

const store = useTutorStore()
const scratch = useScratchStore()
// Signed-out visitors and demo visitors get a sample problem and canned answers (the server decides; this only says so).
const user = useSupabaseUser()
const demo = useDemo()
const sampleOnly = computed(() => !user.value || demo.isDemo.value)

const empty = (): AnswerBoxes => ({ whole: '', num: '', den: '' })
const answer = ref<AnswerBoxes>(empty())
/** The bar model for a "fraction of the rest" problem, or null when this problem is not that kind. */
const barStages = computed(() => {
  const plan = store.plan
  if (!plan) return null
  if (plan.unit) return buildUnitPlan(plan.unit, plan.whole)?.stages ?? null
  if (plan.rate) return buildRatePlan(plan.rate, plan.whole)?.stages ?? null
  // Things in a row get a number line, never a bar: a bar would hide the difference between things and gaps.
  if (plan.spacing) return null
  return buildBarStages(plan)
})
/** The bar she has earned so far: the latest stage whose step she has answered. */
const stageSoFar = computed(() => (barStages.value && store.stepIndex > 0 ? stageAt(barStages.value, store.stepIndex - 1) : null))
const stageNow = computed(() => (barStages.value ? stageAt(barStages.value, store.stepIndex) : null))
/** The number line for a things-in-a-row problem, or null when this problem is not that kind. */
const spacing = computed(() => (store.plan?.spacing ? buildSpacingPlan(store.plan.spacing) : null))
/** A nudge for a common slip, shown only after she gives that exact wrong answer on that step. */
const spacingNudge = computed(() => {
  const wrong = store.lastWrongAnswer.trim()
  if (!spacing.value || !wrong || store.state === 'attempt') return ''
  return spacing.value.nudges.find((n) => n.step === store.stepIndex && n.wrong === wrong)?.message ?? ''
})
const barReplay = ref(0)
const answerKind = ref<'whole' | 'fraction' | 'mixed'>('mixed')
const ANSWER_KINDS = [
  { id: 'whole', label: 'Whole number' },
  { id: 'fraction', label: 'Fraction' },
  { id: 'mixed', label: 'Mixed number' },
] as const
const answerMessage = ref('')
const typing = ref(false)
const wordText = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const input = ref<{ focus: () => void } | null>(null)

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-xl font-bold'
const primary = `${button} min-h-16 bg-emerald-700 px-10 text-2xl text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700`
const secondary = `${button} bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100`

const OPERATION_CHOICES: Array<{ op: AnyOp; label: string }> = [
  { op: 'add', label: 'Add' },
  { op: 'subtract', label: 'Subtract' },
  { op: 'multiply', label: 'Multiply' },
  { op: 'divide', label: 'Divide' },
]

const answering = computed(() => ['attempt', 'hint1', 'hint2', 'hint3', 'teach'].includes(store.state))
const hintNumber = computed(() => (store.state === 'hint1' ? 1 : store.state === 'hint2' ? 2 : store.state === 'hint3' ? 3 : 0))
const checkMethodLabel = computed(() =>
  store.checkMethod === 'addBack' ? 'Proof' : store.checkMethod === 'estimate' ? 'Estimate' : 'None',
)
const slipLabel = computed(() => (store.slip && store.problem ? slipName(store.slip, store.problem.op) : null))

/** One rough-work page per problem step, kept while the tab stays open. */
const padKey = computed(() => `tutor-${store.inSimilar ? 's' : 'm'}-${store.stepIndex}-${store.problemText.length}`)
const showPad = computed(() => scratch.open && (answering.value || store.state === 'understand'))

/** Switching the kind clears boxes that kind does not use, so nothing hidden is sent. */
function pickKind(kind: typeof answerKind.value) {
  answerKind.value = kind
  answer.value = {
    whole: kind === 'fraction' ? '' : answer.value.whole,
    num: kind === 'whole' ? '' : answer.value.num,
    den: kind === 'whole' ? '' : answer.value.den,
  }
  answerMessage.value = ''
  focusAnswer()
}

async function focusAnswer() {
  await nextTick()
  input.value?.focus()
}

watch(
  () => store.stepIndex,
  () => {
    answerKind.value = 'mixed'
    answer.value = empty()
  },
)

watch(
  () => store.state,
  (state) => {
    answerMessage.value = ''
    if (['attempt', 'hint1', 'hint2', 'hint3', 'teach'].includes(state)) focusAnswer()
  },
)

// --- capture ---
async function onPhoto(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  try {
    const photo = await resizePhoto(file)
    await store.readProblem(photo)
  } catch {
    store.error = 'I could not open that picture. Try another one.'
  }
}

function readWord() {
  if (!wordText.value.trim()) {
    store.error = 'Type or paste the problem first.'
    return
  }
  store.readProblem({ text: wordText.value })
}

// --- attempt, hints, teach ---
async function check() {
  if (isAnswerEmpty(answer.value)) {
    answerMessage.value = 'Type your answer first.'
    return
  }
  if (isFractionIncomplete(answer.value)) {
    answerMessage.value = 'Fill in the top and the bottom number.'
    return
  }
  answerMessage.value = ''
  const result = await store.submitAnswer(boxesToText(answer.value))
  if (result === 'wrong') {
    answer.value = empty()
    focusAnswer()
  }
}

async function stuck() {
  await store.imStuck()
  focusAnswer()
}

function another() {
  store.reset()
  answer.value = empty()
  answerKind.value = 'mixed'
  typing.value = false
  wordText.value = ''
  scratch.reset()
}
</script>

<template>
  <div :class="['mx-auto', showPad ? 'max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-6' : 'max-w-3xl']">
  <div :class="['min-w-0 space-y-6', showPad ? 'pb-[50vh] lg:pb-0' : '']">
    <div v-if="answering || store.state === 'understand'" class="flex justify-end">
      <button
        type="button"
        aria-controls="rough-work"
        :aria-expanded="showPad"
        class="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 text-lg font-semibold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100"
        @click="scratch.toggle()"
      >
        <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
          <path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z" stroke-linejoin="round" />
        </svg>
        Rough work
      </button>
    </div>

    <!-- 1. Capture -->
    <section v-if="store.state === 'capture'" class="space-y-6">
      <h1 class="text-4xl font-bold text-emerald-900">Show me your problem</h1>

      <div v-if="!typing" class="flex flex-wrap gap-4">
        <label
          :class="[primary, 'cursor-pointer has-focus-visible:outline-4 has-focus-visible:outline-offset-2 has-focus-visible:outline-indigo-700']"
        >
          <svg viewBox="0 0 24 24" class="mr-3 size-8" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
            <path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" stroke-linejoin="round" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          Take a photo
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            capture="environment"
            class="sr-only"
            :disabled="store.busy === 'reading'"
            @change="onPhoto"
          />
        </label>
        <button type="button" :class="secondary" @click="typing = true">Type it</button>
        <p v-if="sampleOnly" class="w-full text-base text-slate-700">Demo: the tutor uses a sample problem.</p>
      </div>

      <div v-else class="space-y-4">
        <label for="word-problem" class="block text-2xl font-semibold text-slate-900">Type or paste your problem.</label>
        <textarea
          id="word-problem"
          v-model="wordText"
          maxlength="1000"
          rows="5"
          class="w-full rounded-xl border-2 border-slate-700 bg-white p-4 text-xl text-slate-900"
        />
        <div class="flex flex-wrap gap-3">
          <button type="button" :class="primary" :disabled="store.busy === 'reading'" @click="readWord">Read it</button>
          <button type="button" :class="secondary" @click="typing = false">Back</button>
        </div>
      </div>

      <div role="status" aria-live="polite">
        <p v-if="store.busy === 'reading'" class="text-2xl font-semibold text-slate-800">Thinking…</p>
        <p v-if="store.error" class="text-xl font-semibold text-red-800" role="alert">{{ store.error }}</p>
      </div>
    </section>

    <!-- 1b. Check what was read from the photo -->
    <section v-else-if="store.state === 'review'" class="space-y-6">
      <h1 class="text-4xl font-bold text-emerald-900">Is this your problem?</h1>
      <label for="review-text" class="block text-2xl font-semibold text-slate-900">
        This is what I read from your picture. Fix anything that is wrong.
      </label>
      <textarea
        id="review-text"
        v-model="store.reviewText"
        maxlength="1000"
        rows="6"
        class="w-full rounded-xl border-2 border-slate-700 bg-white p-4 text-xl text-slate-900"
      />
      <p v-if="store.confidence === 'low'" class="text-xl font-semibold text-amber-950" role="status">
        I am not sure I read this right. Please check the numbers.
      </p>
      <div class="flex flex-wrap gap-4">
        <button type="button" :class="primary" :disabled="store.busy === 'reading'" @click="store.submitReviewed(store.reviewText)">
          Yes, use this
        </button>
        <button type="button" :class="secondary" @click="another">Take another photo</button>
      </div>
      <div role="status" aria-live="polite">
        <p v-if="store.busy === 'reading'" class="text-2xl font-semibold text-slate-800">Thinking…</p>
        <p v-if="store.error" class="text-xl font-semibold text-red-800" role="alert">{{ store.error }}</p>
      </div>
    </section>

    <!-- 2a. Confirm a problem with several steps -->
    <section v-else-if="store.state === 'confirm' && store.plan" class="space-y-6">
      <h1 class="text-4xl font-bold text-emerald-900">Is this your problem?</h1>
      <p class="rounded-2xl bg-white p-6 text-2xl leading-snug text-slate-900 shadow-sm">{{ store.problemText }}</p>
      <p class="text-center text-xl text-slate-800">This one has {{ store.stepCount }} steps. We will take them one at a time.</p>
      <p v-if="store.confidence === 'low'" class="text-center text-xl font-semibold text-amber-950" role="status">
        I am not sure I read this right. Please check.
      </p>
      <div class="flex flex-wrap justify-center gap-4">
        <button type="button" :class="primary" @click="store.confirmProblem()">Yes</button>
        <button type="button" :class="secondary" @click="another">This isn’t my problem</button>
      </div>
    </section>

    <!-- 2. Confirm: always, never skipped -->
    <section v-else-if="store.state === 'confirm' && store.problem" class="space-y-6">
      <h1 class="text-4xl font-bold text-emerald-900">Is this your problem?</h1>
      <PracticeProblemCard :problem="store.problem" />
      <p v-if="store.problemText" class="text-center text-lg text-slate-700">I read: {{ store.problemText }}</p>
      <p v-if="store.confidence === 'low'" class="text-center text-xl font-semibold text-amber-950" role="status">
        I am not sure I read this right. Please check.
      </p>

      <div class="flex flex-wrap justify-center gap-4">
        <button type="button" :class="primary" @click="store.confirmProblem()">Yes</button>
        <button type="button" :class="secondary" @click="another">This isn’t my problem</button>
      </div>
    </section>

    <!-- 3. Understand the question and find the operation first -->
    <section v-else-if="store.state === 'understand' && store.problem" class="space-y-6">
      <h1 class="text-4xl font-bold text-emerald-900">Let’s understand it</h1>
      <TutorStepHeader />
      <p v-if="store.confidence === 'low'" class="text-center text-xl font-semibold text-amber-950" role="status">
        I am not sure I read this right. If it looks wrong, tap “This isn’t my problem”.
      </p>
      <PracticeProblemCard v-if="!spacing" :problem="store.problem" :hide-operation="true" />
      <p v-if="store.problemText && !store.plan" class="text-center text-lg text-slate-700">{{ store.problemText }}</p>
      <section v-if="spacing" aria-label="What is given" class="space-y-3 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <h2 class="text-xl font-bold text-slate-900">What is given</h2>
        <ul class="list-disc space-y-1 pl-6 text-xl text-slate-900">
          <li v-for="fact in spacing.facts" :key="fact">{{ fact }}</li>
        </ul>
      </section>
      <!-- The picture sits with the question and the choice of operation, so she can look at it while she decides. -->
      <section v-if="spacing" aria-label="The picture" class="space-y-2 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <h2 class="text-xl font-bold text-slate-900">{{ store.stepIndex === 0 ? 'Picture the row' : 'What we found so far' }}</h2>
        <TutorSpacingPicture :built="spacing" :done="store.stepIndex" />
      </section>
      <TutorStepVisual v-else :problem="store.problem" mode="question" />

      <div v-if="!store.plan && !store.understanding.text && !store.understanding.loading">
        <button type="button" :class="secondary" @click="store.explainQuestion()">I don’t understand the question</button>
      </div>
      <div role="status" aria-live="polite" class="space-y-3">
        <p v-if="store.understanding.loading" class="text-2xl font-semibold text-slate-800">Thinking…</p>
        <p
          v-else-if="store.understanding.text"
          class="rounded-2xl border-2 border-indigo-700 bg-indigo-50 p-5 text-2xl leading-snug text-slate-900"
        >
          {{ store.understanding.text }}
        </p>
      </div>

      <div class="space-y-3">
        <h2 class="text-2xl font-bold text-slate-900">Which operation do you need?</h2>
        <div class="flex flex-wrap gap-3" role="group" aria-label="Pick the operation">
          <button
            v-for="choice in OPERATION_CHOICES"
            :key="choice.op"
            type="button"
            :disabled="store.understanding.done"
            :aria-pressed="store.understanding.choice === choice.op"
            :class="[
              button,
              'min-h-16 px-6 text-2xl',
              store.understanding.choice === choice.op && store.understanding.done
                ? 'bg-emerald-700 text-white'
                : 'bg-white text-emerald-900 ring-2 ring-emerald-700 disabled:cursor-not-allowed disabled:text-slate-600 disabled:ring-slate-400',
            ]"
            @click="store.chooseOperation(choice.op)"
          >
            <span aria-hidden="true" class="mr-2">{{ opSymbol(choice.op) }}</span> {{ choice.label }}
          </button>
        </div>
        <div role="status" aria-live="polite">
          <p
            v-if="store.understanding.message"
            :class="[
              'rounded-2xl p-4 text-2xl font-bold',
              store.understanding.done && !store.understanding.revealed
                ? 'celebrate bg-emerald-100 text-emerald-950'
                : 'bg-amber-100 text-amber-950',
            ]"
          >
            {{ store.understanding.message }}
          </p>
        </div>
      </div>

      <div v-if="store.understanding.done" class="flex justify-center">
        <button type="button" :class="primary" @click="store.continueFromUnderstanding()">Next</button>
      </div>
      <div v-else-if="!store.plan" class="flex justify-center">
        <button type="button" :class="secondary" @click="store.doesNotLookRight()">This isn’t my problem</button>
      </div>
    </section>

    <!-- 4. Attempt, hints and teach -->
    <section v-else-if="answering && store.problem" class="space-y-6">
      <h1 class="sr-only">Solve it</h1>
      <TutorStepHeader />
      <p v-if="store.plan" class="text-2xl font-semibold text-slate-900">{{ store.stepLabel }}</p>
      <p v-if="hintNumber" class="text-xl font-semibold text-slate-800">Hint {{ hintNumber }} of 3</p>
      <!-- In a multi-step problem the hint sits under the question and above the numbers. -->
      <PracticeProblemCard v-if="store.state !== 'teach'" :problem="store.problem" />
      <section v-if="spacing && store.state !== 'teach'" aria-label="The picture" class="space-y-2 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <h2 class="text-xl font-bold text-slate-900">{{ store.stepIndex === 0 ? 'Picture the row' : 'What we found so far' }}</h2>
        <TutorSpacingPicture :built="spacing" :done="store.stepIndex" />
      </section>
      <TutorStepVisual v-if="store.state !== 'teach' && !spacing" :problem="store.problem" mode="step" />
      <section
        v-if="stageSoFar && store.state !== 'teach'"
        aria-label="The bar model so far"
        class="space-y-2 rounded-2xl bg-white p-4 shadow-sm sm:p-6"
      >
        <h2 class="text-xl font-bold text-slate-900">What we found so far</h2>
        <TutorFractionBar :stage="stageSoFar" still />
      </section>
      <details v-if="store.plan?.rate && store.stepIndex === 1 && store.state !== 'teach'" class="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <summary class="min-h-11 cursor-pointer text-xl font-bold text-slate-900">Try an easier one first (optional)</summary>
        <div class="pt-3">
          <TutorWarmUp :days="Number(store.plan.rate.first.days)" />
        </div>
      </details>
      <details v-if="barStages" class="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <summary class="min-h-11 cursor-pointer text-xl font-bold text-slate-900">Draw your own bar model (optional)</summary>
        <div class="pt-3">
          <TutorBarSketch :key="`${store.inSimilar}-${store.stepIndex}`" />
        </div>
      </details>

      <PracticeLearnPanel
        v-if="store.state === 'teach'"
        :problem="store.problem"
        :answer="store.lastWrongAnswer"
        :question="store.plan ? '' : store.problemText"
        :show-try-like="false"
        :show-back="false"
      />
      <p v-if="store.state === 'teach'" class="text-xl font-semibold text-slate-900">Now try your answer again.</p>

      <!-- The hint sits right above the answer boxes, so she never scrolls between them. -->
      <TutorHelpMessages />
      <p v-if="spacingNudge" class="rounded-2xl border-2 border-indigo-700 bg-indigo-50 p-4 text-2xl text-slate-900" role="status">{{ spacingNudge }}</p>

      <form class="space-y-4" @submit.prevent="check">
        <p v-if="store.state === 'attempt'" class="text-center text-xl font-semibold">Try it first. What is your answer?</p>
        <div role="radiogroup" aria-label="What kind of answer?" class="flex flex-wrap justify-center gap-2">
          <button
            v-for="kind in ANSWER_KINDS"
            :key="kind.id"
            type="button"
            role="radio"
            :aria-checked="answerKind === kind.id"
            :class="[
              'inline-flex min-h-11 items-center rounded-xl px-4 text-lg font-semibold',
              answerKind === kind.id ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-900 ring-2 ring-emerald-700',
            ]"
            @click="pickKind(kind.id)"
          >
            {{ kind.label }}
          </button>
        </div>
        <PracticeMixedNumberInput ref="input" v-model="answer" :kind="answerKind" @submit="check" />
        <p v-if="answerMessage" class="text-center text-xl font-semibold text-red-800" role="alert">{{ answerMessage }}</p>
        <div class="flex flex-wrap justify-center gap-4">
          <button type="submit" :class="primary" :disabled="!store.canAnswer">Check my answer</button>
          <button v-if="store.state !== 'teach'" type="button" :class="secondary" :disabled="!store.canBeStuck" @click="stuck">
            I’m stuck
          </button>
        </div>
      </form>
    </section>

    <!-- 4a. A step of a multi-step problem is done -->
    <section v-else-if="store.state === 'stepDone' && store.problem" class="space-y-6">
      <p class="celebrate text-3xl font-bold text-emerald-900" role="status">
        <span aria-hidden="true">🎉</span> {{ store.successMessage }}
      </p>
      <h1 class="text-4xl font-bold text-emerald-900">Step {{ store.stepIndex + 1 }} done</h1>
      <p class="text-center text-2xl text-slate-900">
        {{ store.stepLabel }} <span class="font-bold">{{ store.acceptedAnswer }}</span>
      </p>
      <section v-if="spacing" aria-label="The picture" class="space-y-2 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <h2 class="text-xl font-bold text-slate-900">See it in the picture</h2>
        <TutorSpacingPicture :built="spacing" :done="store.stepIndex + 1" />
      </section>
      <section v-else-if="stageNow" aria-label="The bar model" class="space-y-2 rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-xl font-bold text-slate-900">See it in a bar model</h2>
          <button
            type="button"
            class="min-h-11 rounded-xl px-4 text-base font-semibold text-slate-900 underline underline-offset-4"
            @click="barReplay++"
          >
            Show again
          </button>
        </div>
        <TutorFractionBar :stage="stageNow" :still="stageNow.step !== store.stepIndex" :replay="barReplay" />
      </section>
      <div class="flex justify-center">
        <button type="button" :class="primary" @click="store.nextStep()">
          {{ store.stepIndex + 1 >= store.stepCount ? 'Done' : 'Next step' }}
        </button>
      </div>
    </section>

    <!-- 4b. Offer a similar problem to check she can do it again -->
    <section v-else-if="store.state === 'similar'" class="space-y-6">
      <h1 class="text-4xl font-bold text-emerald-900">You solved it!</h1>
      <ol class="space-y-2 rounded-xl bg-white p-4 text-xl text-slate-900" aria-label="Your steps">
        <li v-for="(done, i) in store.mainSteps" :key="i">
          Step {{ i + 1 }}: {{ done.label }} <span class="font-bold">{{ done.answer }}</span>
        </li>
      </ol>
      <p class="text-2xl font-bold text-emerald-900">The answer is {{ store.mainSteps.at(-1)?.answer }}.</p>
      <section v-if="barStages" aria-label="The bar model" class="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
        <TutorFractionBar :stage="barStages.at(-1)!" still />
      </section>
      <p class="text-center text-2xl text-slate-900">Want to try one like it, with new numbers?</p>
      <div class="flex flex-wrap justify-center gap-4">
        <button type="button" :class="primary" @click="store.startSimilar()">Try one like it</button>
        <button type="button" :class="secondary" @click="store.skipSimilar()">Finish</button>
      </div>
    </section>

    <!-- 4. The check: required -->
    <section v-else-if="store.state === 'check' && store.problem" class="space-y-6">
      <p v-if="store.successMessage" class="celebrate text-3xl font-bold text-emerald-900" role="status">
        <span aria-hidden="true">🎉</span> {{ store.successMessage }}
      </p>
      <h1 class="text-4xl font-bold text-emerald-900">Now check it!</h1>
      <PracticeProblemCard :problem="store.problem" />
      <p class="text-center text-2xl text-slate-900">
        Your answer: <span class="font-bold">{{ store.acceptedAnswer }}</span>. How can you be sure?
      </p>

      <div v-if="!store.checkDone" class="flex flex-wrap justify-center gap-4" role="group" aria-label="Pick a way to check">
        <button
          type="button"
          :aria-pressed="store.chosenCheck === 'addBack'"
          :class="[button, 'min-h-16 px-8 text-2xl', store.chosenCheck === 'addBack' ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-900 ring-2 ring-emerald-700']"
          @click="store.chooseCheck('addBack')"
        >
          Give proof
        </button>
        <button
          v-if="store.estimateAvailable"
          type="button"
          :aria-pressed="store.chosenCheck === 'estimate'"
          :class="[button, 'min-h-16 px-8 text-2xl', store.chosenCheck === 'estimate' ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-900 ring-2 ring-emerald-700']"
          @click="store.chooseCheck('estimate')"
        >
          Estimate
        </button>
      </div>

      <PracticeProofPanel
        v-if="store.chosenCheck === 'addBack' && store.addBackProof"
        :key="'add-back'"
        :proof="store.addBackProof"
        @submit="store.submitAddBack($event)"
      />
      <TutorEstimatePanel v-if="store.chosenCheck === 'estimate'" :key="'estimate'" />

      <div v-if="store.checkDone" class="flex justify-center">
        <button type="button" :class="primary" @click="store.continueFromCheck()">Next</button>
      </div>
    </section>

    <!-- 6. Done -->
    <section v-else-if="store.state === 'done'" class="space-y-6">
      <h1 class="text-4xl font-bold text-emerald-900">All done. Great thinking!</h1>

      <ol v-if="store.plan" class="space-y-2 rounded-xl bg-white p-4 text-xl text-slate-900" aria-label="Your steps">
        <li v-for="(done, i) in store.mainSteps" :key="i">
          Step {{ i + 1 }}: {{ done.label }} <span class="font-bold">{{ done.answer }}</span>
        </li>
      </ol>
      <p v-if="store.plan && store.mainSteps.length" class="text-2xl font-bold text-emerald-900">
        The answer is {{ store.mainSteps.at(-1)!.answer }}.
      </p>
      <p v-if="store.inSimilar && store.finishedSteps.length" class="text-xl text-slate-900">
        The practice problem: the answer is <span class="font-bold">{{ store.finishedSteps.at(-1)!.answer }}</span>.
      </p>

      <dl class="grid gap-3 text-xl sm:grid-cols-2">
        <div class="rounded-xl bg-white p-4">
          <dt class="text-lg text-slate-700">Hints used</dt>
          <dd class="text-3xl font-bold">{{ store.plan ? store.planTotals.hints : store.hintsUsed }}</dd>
        </div>
        <div class="rounded-xl bg-white p-4">
          <dt class="text-lg text-slate-700">Tries</dt>
          <dd class="text-3xl font-bold">{{ store.plan ? store.planTotals.attempts : store.attempts }}</dd>
        </div>
        <div v-if="!store.plan" class="rounded-xl bg-white p-4">
          <dt class="text-lg text-slate-700">How you checked</dt>
          <dd class="text-3xl font-bold">{{ checkMethodLabel }}</dd>
        </div>
      </dl>
      <p v-if="slipLabel" class="text-xl text-slate-800">One thing to watch: {{ slipLabel }}.</p>

      <button type="button" :class="primary" @click="another">Solve another</button>
    </section>
  </div>

  <!-- Rough work: beside the problem on wide screens, a bottom sheet on narrow ones. -->
  <aside
    v-if="showPad"
    id="rough-work"
    aria-label="Rough work"
    class="fixed inset-x-0 bottom-0 z-20 max-h-[48vh] overflow-y-auto rounded-t-2xl border-t-4 border-slate-700 bg-emerald-50 p-4 shadow-2xl lg:sticky lg:top-4 lg:max-h-none lg:overflow-visible lg:rounded-2xl lg:border-4 lg:shadow-md"
  >
    <PracticeScratchPad :key="store.plan?.spacing ? 'line' : 'plain'" :page-key="padKey" :number-line="Boolean(store.plan?.spacing)" @close="scratch.toggle()" />
  </aside>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .celebrate {
    animation: pop 0.6s ease-out 1;
  }
}
@keyframes pop {
  0% {
    transform: scale(0.85);
    opacity: 0;
  }
  60% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}
</style>
