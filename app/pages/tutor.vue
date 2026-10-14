<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useTutorStore } from '../stores/tutor'
import { boxesToText, isAnswerEmpty, isFractionIncomplete, type AnswerBoxes } from '../utils/answer'
import { slipName } from '../utils/messages'
import { NOT_SIMPLEST_MESSAGE } from '../utils/messages'
import { resizePhoto } from '../utils/image'
import { opSymbol, type AnyOp, type AnyProblem } from '../utils/fraction'

useHead({ title: 'Tutor · MathSprout' })

const store = useTutorStore()

const empty = (): AnswerBoxes => ({ whole: '', num: '', den: '' })
const answer = ref<AnswerBoxes>(empty())
const answerMessage = ref('')
const typing = ref(false)
const wordMode = ref(false)
const wordText = ref('')
const fixing = ref(false)
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
const latestHint = computed(() => store.hints.at(-1) ?? '')
const checkMethodLabel = computed(() =>
  store.checkMethod === 'addBack' ? 'Proof' : store.checkMethod === 'estimate' ? 'Estimate' : 'None',
)
const slipLabel = computed(() => (store.slip && store.problem ? slipName(store.slip, store.problem.op) : null))

async function focusAnswer() {
  await nextTick()
  input.value?.focus()
}

watch(
  () => store.state,
  (state) => {
    answerMessage.value = ''
    fixing.value = false
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

function typed(problem: AnyProblem) {
  store.enterTyped(problem)
}

// --- confirm ---
function saveFix(problem: AnyProblem) {
  if (store.editProblem(problem) === null) fixing.value = false
}

// --- attempt, hints, teach ---
async function check() {
  if (isAnswerEmpty(answer.value)) {
    answerMessage.value = 'Type your answer in the boxes first.'
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
  typing.value = false
  wordMode.value = false
  wordText.value = ''
}
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
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
      </div>

      <div v-else class="space-y-5">
        <div v-if="!wordMode" class="space-y-4">
          <TutorProblemEntry submit-label="Use these numbers" :error="store.error" @submit="typed" />
          <button type="button" :class="secondary" @click="wordMode = true">Type a word problem instead</button>
        </div>
        <div v-else class="space-y-4">
          <label for="word-problem" class="block text-2xl font-semibold text-slate-900">Type or paste your problem.</label>
          <textarea
            id="word-problem"
            v-model="wordText"
            maxlength="1000"
            rows="4"
            class="w-full rounded-xl border-2 border-slate-700 bg-white p-4 text-xl text-slate-900"
          />
          <div class="flex flex-wrap gap-3">
            <button type="button" :class="primary" :disabled="store.busy === 'reading'" @click="readWord">Read it</button>
            <button type="button" :class="secondary" @click="wordMode = false">Type numbers instead</button>
          </div>
        </div>
        <button type="button" :class="secondary" @click="typing = false; wordMode = false">Back</button>
      </div>

      <div role="status" aria-live="polite">
        <p v-if="store.busy === 'reading'" class="text-2xl font-semibold text-slate-800">Thinking…</p>
        <p v-if="store.error && !(typing && !wordMode)" class="text-xl font-semibold text-red-800" role="alert">{{ store.error }}</p>
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

      <div v-if="!fixing" class="flex flex-wrap justify-center gap-4">
        <button type="button" :class="primary" @click="store.confirmProblem()">Yes</button>
        <button type="button" :class="secondary" @click="fixing = true">Fix it</button>
      </div>
      <div v-else class="space-y-4">
        <TutorProblemEntry :initial="store.problem" submit-label="Save" :error="store.error" @submit="saveFix" />
        <button type="button" :class="secondary" @click="fixing = false">Cancel</button>
      </div>
    </section>

    <!-- 3. Understand the question and find the operation first -->
    <section v-else-if="store.state === 'understand' && store.problem" class="space-y-6">
      <h1 class="text-4xl font-bold text-emerald-900">Let’s understand it</h1>
      <TutorStepHeader />
      <p v-if="store.confidence === 'low'" class="text-center text-xl font-semibold text-amber-950" role="status">
        I am not sure I read this right. If it looks wrong, tap “This isn’t my problem”.
      </p>
      <PracticeProblemCard :problem="store.problem" :hide-operation="true" />
      <p v-if="store.problemText && !store.plan" class="text-center text-lg text-slate-700">{{ store.problemText }}</p>

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
      <PracticeProblemCard v-if="store.state !== 'teach'" :problem="store.problem" />

      <div role="status" aria-live="polite" class="space-y-3">
        <p v-if="store.busy === 'hint'" class="text-2xl font-semibold text-slate-800">Thinking…</p>
        <p v-if="store.wrongMessage" class="text-2xl font-bold text-indigo-950">{{ store.wrongMessage }}</p>
        <p
          v-if="latestHint && store.state !== 'teach' && store.busy !== 'hint'"
          class="rounded-2xl border-2 border-indigo-700 bg-indigo-50 p-4 text-2xl text-slate-900"
        >
          {{ latestHint }}
        </p>
        <p v-if="store.hintsOffline" class="text-base text-slate-700">The tutor could not be reached, so this hint comes from the app.</p>
        <p
          v-if="store.notSimplest"
          class="rounded-2xl border-2 border-amber-700 bg-amber-100 p-4 text-2xl font-bold text-amber-950"
        >
          {{ NOT_SIMPLEST_MESSAGE }}
        </p>
      </div>

      <PracticeLearnPanel
        v-if="store.state === 'teach'"
        :problem="store.problem"
        :answer="store.lastWrongAnswer"
        :question="store.plan ? '' : store.problemText"
        :show-try-like="false"
        :show-back="false"
      />
      <p v-if="store.state === 'teach'" class="text-xl font-semibold text-slate-900">Now try your answer again.</p>

      <form class="space-y-4" @submit.prevent="check">
        <p v-if="store.state === 'attempt'" class="text-center text-xl font-semibold">Try it first. What is your answer?</p>
        <PracticeMixedNumberInput ref="input" v-model="answer" @submit="check" />
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
