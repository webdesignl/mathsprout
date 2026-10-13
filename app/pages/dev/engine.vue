<script setup lang="ts">
import { computed, ref } from 'vue'
import { boxesToText, mixedToBoxes, textToBoxes, type AnswerBoxes } from '../../utils/answer'
import { ADD_SUBTRACT_EXAMPLES, MULTIPLY_DIVIDE_EXAMPLES, type EngineExample } from '../../utils/engineExamples'
import { analyze } from '../../utils/engineLab'
import { opSymbol, type AnyOp, type MixedNumber } from '../../utils/fraction'
import { generateProblem } from '../../utils/problems'

// A developer tool: it only exists while developing. In a production build the route is removed
// (see nuxt.config.ts), and this check is a second lock.
if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Page Not Found', fatal: true })
}

useHead({ title: 'Engine playground · MathSprout', meta: [{ name: 'robots', content: 'noindex' }] })

const OPERATIONS: AnyOp[] = ['add', 'subtract', 'multiply', 'divide']
const OP_NAMES: Record<AnyOp, string> = { add: 'Add', subtract: 'Subtract', multiply: 'Multiply', divide: 'Divide' }

const op = ref<AnyOp>('subtract')
const first = ref<AnswerBoxes>(textToBoxes('8 1/5'))
const second = ref<AnswerBoxes>(textToBoxes('4 3/4'))
const student = ref('')

const lab = computed(() => analyze(op.value, boxesToText(first.value), boxesToText(second.value), student.value))

function useExample(example: EngineExample) {
  op.value = example.op
  first.value = textToBoxes(example.a)
  second.value = textToBoxes(example.b)
  student.value = example.student?.text ?? ''
}

/** A random problem from the same generator the Practice page uses, for the chosen operation. */
function random() {
  const problem = generateProblem({ op: op.value, maxDenominator: 12 })
  first.value = mixedToBoxes(problem.a as MixedNumber)
  second.value = mixedToBoxes(problem.b as MixedNumber)
  student.value = ''
}

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-lg font-bold'
const chip = 'rounded-lg bg-white px-3 py-2 text-base font-semibold text-slate-900 ring-1 ring-slate-500 hover:bg-slate-100'
const card = 'rounded-2xl bg-white p-5 shadow-sm space-y-3'
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6">
    <div class="space-y-1">
      <h1 class="text-3xl font-bold text-slate-900">Engine playground</h1>
      <p class="text-lg text-slate-700">
        Developer tool. Everything below comes straight from <code>fraction.ts</code>. It is not in production builds.
      </p>
    </div>

    <!-- Examples -->
    <section :class="card" aria-labelledby="examples">
      <h2 id="examples" class="text-xl font-bold">Examples</h2>
      <div class="space-y-3">
        <div>
          <p class="mb-2 text-base font-semibold text-slate-700">Add and subtract</p>
          <div class="flex flex-wrap gap-2">
            <button v-for="e in ADD_SUBTRACT_EXAMPLES" :key="e.label" type="button" :class="chip" @click="useExample(e)">
              {{ e.label }}
            </button>
          </div>
        </div>
        <div>
          <p class="mb-2 text-base font-semibold text-slate-700">Multiply and divide</p>
          <div class="flex flex-wrap gap-2">
            <button v-for="e in MULTIPLY_DIVIDE_EXAMPLES" :key="e.label" type="button" :class="chip" @click="useExample(e)">
              {{ e.label }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Inputs -->
    <section :class="card" aria-labelledby="inputs">
      <h2 id="inputs" class="text-xl font-bold">Numbers</h2>
      <div class="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <PracticeMixedNumberInput v-model="first" />
        <div class="flex justify-center gap-2" role="group" aria-label="Operation">
          <button
            v-for="o in OPERATIONS"
            :key="o"
            type="button"
            :aria-pressed="op === o"
            :aria-label="OP_NAMES[o]"
            :class="[button, 'size-14 text-3xl', op === o ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-900 ring-2 ring-emerald-700']"
            @click="op = o"
          >
            {{ opSymbol(o) }}
          </button>
        </div>
        <PracticeMixedNumberInput v-model="second" />
      </div>

      <div class="flex flex-wrap items-end gap-4">
        <label class="space-y-1">
          <span class="block text-lg font-semibold">Student answer (optional)</span>
          <input
            v-model="student"
            type="text"
            placeholder="3 9/20"
            autocomplete="off"
            class="min-h-12 w-64 rounded-xl border-2 border-slate-700 bg-white px-4 text-xl"
          />
        </label>
        <button type="button" :class="[button, 'bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100']" @click="random">
          Random {{ OP_NAMES[op].toLowerCase() }} problem
        </button>
      </div>
    </section>

    <p v-if="lab.inputError" class="text-xl font-semibold text-red-800" role="alert">{{ lab.inputError }}</p>

    <template v-else>
      <!-- Result -->
      <section :class="card" aria-labelledby="result" aria-live="polite">
        <h2 id="result" class="text-xl font-bold">Result</h2>
        <p v-if="lab.mathError" class="text-2xl font-bold text-red-800">{{ lab.mathError }} (error result, nothing thrown)</p>
        <dl v-else-if="lab.answer" class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl bg-emerald-50 p-4">
            <dt class="text-base text-slate-700">Mixed number</dt>
            <dd class="text-3xl font-bold">{{ lab.answer.mixed }}</dd>
          </div>
          <div class="rounded-xl bg-emerald-50 p-4">
            <dt class="text-base text-slate-700">Improper fraction</dt>
            <dd class="text-3xl font-bold">{{ lab.answer.improper }}</dd>
          </div>
        </dl>
        <p v-if="lab.answer?.negative" class="text-lg font-semibold text-amber-900">Negative result (flagged by isNegative).</p>
      </section>

      <!-- Steps -->
      <section :class="card" aria-labelledby="steps">
        <h2 id="steps" class="text-xl font-bold">Worked steps</h2>
        <ol class="space-y-3">
          <li
            v-for="(step, i) in lab.steps"
            :key="i"
            class="rounded-xl p-3"
            :class="lab.student?.diagnosis.stepIndex === i ? 'border-4 border-amber-600 bg-amber-100' : 'bg-slate-50'"
          >
            <p class="text-base text-slate-700">
              <span class="font-bold">{{ i }}</span> ·
              <code>{{ step.kind }}</code>
              <span v-if="lab.student?.diagnosis.stepIndex === i" class="ml-2 font-bold text-amber-950">← slip here</span>
            </p>
            <p class="text-lg text-slate-900">{{ step.description }}</p>
            <p class="text-2xl font-bold text-slate-900">{{ step.expression }}</p>
          </li>
        </ol>
      </section>

      <!-- Checks -->
      <section v-if="lab.answer" :class="card" aria-labelledby="checks">
        <h2 id="checks" class="text-xl font-bold">Checks</h2>

        <div v-if="lab.inverse" class="space-y-1">
          <h3 class="text-lg font-semibold">verifyByInverse</h3>
          <p class="text-2xl font-bold">{{ lab.inverse.expression }}</p>
          <p :class="lab.inverse.holds ? 'text-emerald-800' : 'text-red-800'" class="text-lg font-semibold">
            {{ lab.inverse.holds ? 'Holds' : 'Does not hold' }}
          </p>
        </div>

        <div v-if="lab.estimate" class="space-y-1">
          <h3 class="text-lg font-semibold">estimateCheck</h3>
          <p class="text-lg">
            Rounded: <b>{{ lab.estimate.roundedAText }}</b> {{ opSymbol(op) }} <b>{{ lab.estimate.roundedBText }}</b>
            is about <b>{{ lab.estimate.estimateText }}</b>. Distance from the answer: {{ lab.estimate.differenceText }}.
          </p>
          <p :class="lab.estimate.close ? 'text-emerald-800' : 'text-red-800'" class="text-lg font-semibold">
            {{ lab.estimate.close ? 'Close' : 'Not close' }}
            <span v-if="!lab.estimate.reliable" class="text-slate-700">(divisor under 1/4: too rough to estimate)</span>
          </p>
        </div>

        <div v-if="lab.size" class="space-y-1">
          <h3 class="text-lg font-semibold">sizeCheck</h3>
          <p v-if="!lab.size.applies" class="text-lg text-slate-700">The rule does not apply to these numbers.</p>
          <p v-else :class="lab.size.ok ? 'text-emerald-800' : 'text-red-800'" class="text-lg font-semibold">
            {{ lab.size.ok ? 'The answer is the right size.' : lab.size.message }}
          </p>
        </div>
      </section>

      <!-- Student answer -->
      <section v-if="lab.student" :class="card" aria-labelledby="student">
        <h2 id="student" class="text-xl font-bold">Student answer: {{ lab.student.text }}</h2>
        <dl class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl bg-slate-50 p-4">
            <dt class="text-base text-slate-700">checkAnswer</dt>
            <dd class="text-2xl font-bold">{{ lab.student.status ?? 'unreadable' }}</dd>
            <dd class="text-base text-slate-700">simplest form: {{ lab.student.simplestForm || '—' }}</dd>
          </div>
          <div class="rounded-xl bg-slate-50 p-4">
            <dt class="text-base text-slate-700">diagnose</dt>
            <dd class="text-2xl font-bold">{{ lab.student.diagnosis.slip }}</dd>
            <dd class="text-base text-slate-700">
              step index: {{ lab.student.diagnosis.stepIndex ?? 'none' }}
              <span v-if="lab.student.stepKind">({{ lab.student.stepKind }})</span>
            </dd>
          </div>
        </dl>
        <p v-if="lab.student.diagnosis.hint" class="rounded-xl bg-indigo-50 p-3 text-xl text-slate-900">
          Hint: {{ lab.student.diagnosis.hint }}
        </p>
        <p v-if="lab.student.size && lab.student.size.applies && !lab.student.size.ok" class="rounded-xl bg-amber-100 p-3 text-xl font-semibold text-amber-950">
          Size check: {{ lab.student.size.message }}
        </p>
      </section>
    </template>
  </div>
</template>
