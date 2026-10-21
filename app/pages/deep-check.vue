<script setup lang="ts">
import { ITEM_TYPES, RULE_GROUPS } from '../data/deepCheck'
import { useDeepCheckStore } from '../stores/deepCheck'
import { useChildStore } from '../stores/child'
import { challengesIn, challengesSolved, deepCheckProgress, MASTERED_STARS, rulesIn, typeLabel, type AttemptLine, type Grade } from '../utils/deepCheck'

useHead({ title: 'Deep Check · MathSprout' })

const store = useDeepCheckStore()
const childStore = useChildStore()
const client = useSupabaseClient()
const user = useSupabaseUser()

// What she has already shown, for the stars on each rule.
const lines = ref<AttemptLine[]>([])
async function loadProgress() {
  lines.value = []
  if (!user.value || !childStore.selectedId) return
  const { data } = await client
    .from('attempts')
    .select('mode, problem, correct')
    .eq('child_id', childStore.selectedId)
    .eq('mode', 'deep_check')
    .order('created_at', { ascending: false })
    .limit(400)
  lines.value = (data ?? []) as AttemptLine[]
}
onMounted(() => {
  store.goHome()
  void loadProgress()
})
watch(() => store.view, (view) => view === 'home' && loadProgress())
const progress = computed(() => deepCheckProgress(lines.value))
const solvedChallenges = computed(() => challengesSolved(lines.value))

function onChallenge(values: Record<string, string | number>, hintsUsed: number) {
  store.submitChallenge(values, hintsUsed)
}

const question = ref<{ showProblem: (g: Grade) => void } | null>(null)
function typed(text: string) {
  const grade = store.answerReverse(text)
  question.value?.showProblem(grade)
}

const heading = computed(() => {
  if (store.view === 'challenge') return 'Olympiad challenge'
  if (store.view === 'done' || store.view === 'quiz') return store.scope === 'chapter' ? (store.group?.title ?? 'Chapter quiz') : (store.rule?.title ?? 'Fun quiz')
  return 'Deep Check'
})

const scoreMessage = computed(() => {
  const r = store.score / Math.max(store.total, 1)
  if (r === 1) return 'Perfect! You really understand this.'
  if (r >= 0.6) return 'Nice work! You are getting it.'
  return 'Good try! Look at the pictures and try again. Mistakes help you learn.'
})
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-3xl font-bold text-emerald-900 sm:text-4xl">{{ heading }}</h1>
      <button
        v-if="store.view !== 'home'"
        type="button"
        class="inline-flex min-h-12 items-center rounded-xl bg-white px-4 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100"
        @click="store.goHome()"
      >
        All rules
      </button>
    </div>

    <!-- Home: choose a rule, or the chapter quiz -->
    <template v-if="store.view === 'home'">
      <p class="text-lg text-slate-900">
        Fun quizzes to check you really understand the ideas, before a chapter test. Learn the picture first, then try 5 quick
        questions. There is no timer, and every answer teaches you something.
      </p>

      <section v-for="group in RULE_GROUPS" :key="group.id" :aria-labelledby="`group-${group.id}`" class="space-y-4">
        <div class="space-y-1">
          <h2 :id="`group-${group.id}`" class="text-2xl font-bold text-emerald-900">{{ group.title }}</h2>
          <p class="text-base text-slate-700">{{ group.summary }}</p>
        </div>

        <!-- A topic whose rules are not written yet -->
        <p v-if="rulesIn(group.id).length === 0" class="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-base font-semibold text-slate-800">
          Coming soon
        </p>

        <template v-else>
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-700 p-4 text-white sm:p-5">
            <div>
              <h3 class="text-xl font-bold">Chapter quiz</h3>
              <p class="text-base text-emerald-50">10 mixed questions from all {{ rulesIn(group.id).length }} rules here. A good check before a test.</p>
            </div>
            <button type="button" class="inline-flex min-h-12 items-center rounded-xl bg-white px-6 text-lg font-bold text-emerald-900 hover:bg-emerald-50" @click="store.startChapter(group.id)">
              Start
            </button>
          </div>

          <ul class="grid gap-4 sm:grid-cols-2">
            <li v-for="rule in rulesIn(group.id)" :key="rule.id" class="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div>
                <p class="text-base font-semibold text-emerald-800">{{ rule.id }}</p>
                <h3 class="text-xl font-bold text-slate-900">{{ rule.title }}</h3>
                <p class="mt-1 text-base text-slate-700">Fixes: {{ rule.misconception }}</p>
              </div>
              <p
                class="text-lg font-semibold text-amber-900"
                :aria-label="`${progress[rule.id]?.stars ?? 0} of ${MASTERED_STARS} stars`"
              >
                <span aria-hidden="true">{{ '★'.repeat(progress[rule.id]?.stars ?? 0) }}{{ '☆'.repeat(MASTERED_STARS - (progress[rule.id]?.stars ?? 0)) }}</span>
                <span v-if="(progress[rule.id]?.stars ?? 0) === MASTERED_STARS" class="ml-2 rounded-full bg-amber-200 px-2 py-0.5 text-sm text-amber-950">Mastered</span>
              </p>
              <div class="mt-auto flex flex-wrap gap-2">
                <button type="button" class="inline-flex min-h-12 items-center rounded-xl bg-white px-4 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100" @click="store.openLearn(rule.id)">
                  Learn
                </button>
                <button type="button" class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-4 text-lg font-bold text-white hover:bg-emerald-800" @click="store.startRule(rule.id)">
                  Quiz me
                </button>
              </div>
            </li>
          </ul>

          <!-- Olympiad challenges for this topic -->
          <div v-if="challengesIn(group.id).length" class="space-y-3">
            <h3 class="text-xl font-bold text-emerald-900">Olympiad challenges</h3>
            <p class="text-base text-slate-700">Word problems and puzzles with a hint. Take your time.</p>
            <ul class="grid gap-3 sm:grid-cols-2">
              <li v-for="c in challengesIn(group.id)" :key="c.id" class="flex flex-col gap-2 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <div class="flex items-start justify-between gap-2">
                  <h4 class="text-lg font-bold text-slate-900">{{ c.title }}</h4>
                  <span v-if="solvedChallenges.has(c.id)" class="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-sm font-semibold text-emerald-950">Solved ✓</span>
                </div>
                <button type="button" class="mt-auto inline-flex min-h-12 w-fit items-center rounded-xl bg-white px-4 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100" @click="store.openChallenge(c.id)">
                  {{ solvedChallenges.has(c.id) ? 'Play again' : 'Try it' }}
                </button>
              </li>
            </ul>
          </div>
        </template>
      </section>
    </template>

    <!-- Learn mode -->
    <DeepCheckLearnPanel v-else-if="store.view === 'learn' && store.rule" :rule="store.rule" @quiz="store.startRule(store.rule.id)" @back="store.goHome()" />

    <!-- An Olympiad challenge -->
    <DeepCheckChallengePlay
      v-else-if="store.view === 'challenge' && store.challenge"
      :key="store.challenge.id"
      :challenge="store.challenge"
      :result="store.challengeResult"
      @submit="onChallenge"
      @again="store.tryAgain()"
      @back="store.goHome()"
    />

    <!-- A quiz -->
    <section v-else-if="store.view === 'quiz' && store.current" class="space-y-4" aria-labelledby="question-title">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-base font-semibold text-slate-700">Question {{ store.index + 1 }} of {{ store.total }}</p>
        <p id="question-title" class="rounded-full bg-emerald-100 px-3 py-1 text-base font-semibold text-emerald-950">
          <span aria-hidden="true">{{ ITEM_TYPES.find((t) => t.type === store.current?.type)?.icon }}</span>
          {{ typeLabel(store.current.type) }}
        </p>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" :aria-valuenow="store.index + 1" aria-valuemin="1" :aria-valuemax="store.total" aria-label="Quiz progress">
        <div class="h-full bg-emerald-600" :style="{ width: `${((store.index + (store.answered ? 1 : 0)) / store.total) * 100}%` }" />
      </div>

      <div class="space-y-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <DeepCheckQuizQuestion
          :key="store.current.id"
          ref="question"
          :item="store.current"
          :feedback="store.feedback"
          @asn="store.answerAsn($event)"
          @choice="store.answerChoice($event)"
          @reverse="typed($event)"
          @draw="store.answerDraw($event)"
        />
      </div>

      <div v-if="store.feedback" role="status" class="space-y-3 rounded-2xl p-4 ring-2" :class="store.feedback.correct ? 'bg-emerald-50 ring-emerald-500' : 'bg-amber-50 ring-amber-400'">
        <p class="text-xl font-bold" :class="store.feedback.correct ? 'text-emerald-900' : 'text-amber-950'">
          {{ store.feedback.correct ? 'Yes! That’s right.' : 'Not quite. Here’s the idea.' }}
        </p>
        <p v-if="store.feedback.message" class="text-lg text-slate-900">{{ store.feedback.message }}</p>
        <p class="text-lg text-slate-900">{{ store.feedback.explanation }}</p>
        <div class="flex flex-wrap gap-3">
          <button type="button" class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-6 text-lg font-bold text-white hover:bg-emerald-800" @click="store.next()">
            {{ store.isLast ? 'See my result' : 'Next question' }}
          </button>
          <button
            v-if="!store.feedback.correct && store.current && store.scope !== 'chapter'"
            type="button"
            class="inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100"
            @click="store.openLearn(store.current.ruleId)"
          >
            See the picture
          </button>
        </div>
      </div>
    </section>

    <!-- Result -->
    <section v-else-if="store.view === 'done'" class="space-y-4" aria-labelledby="result-title">
      <div class="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200">
        <p class="text-5xl" aria-hidden="true">{{ store.score === store.total ? '🌟' : '👏' }}</p>
        <h2 id="result-title" class="mt-2 text-3xl font-bold text-emerald-900">{{ store.score }} out of {{ store.total }}</h2>
        <p class="mt-1 text-xl text-slate-900">{{ scoreMessage }}</p>
      </div>
      <ul class="space-y-2">
        <li v-for="(r, i) in store.results" :key="r.id" class="flex items-center gap-3 rounded-xl bg-white p-3 text-lg ring-1 ring-slate-200">
          <span aria-hidden="true">{{ r.correct ? '✅' : '❌' }}</span>
          <span class="sr-only">{{ r.correct ? 'Right' : 'Not quite' }}:</span>
          <span>{{ i + 1 }}. {{ r.id.split('-')[0] }} · {{ typeLabel(store.items[i]!.type) }}</span>
        </li>
      </ul>
      <div class="flex flex-wrap gap-3">
        <button v-if="store.scope === 'chapter'" type="button" class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-6 text-lg font-bold text-white hover:bg-emerald-800" @click="store.startChapter(store.groupId)">
          Another chapter quiz
        </button>
        <button v-else type="button" class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-6 text-lg font-bold text-white hover:bg-emerald-800" @click="store.startRule(store.scope)">
          Try this rule again
        </button>
        <button type="button" class="inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100" @click="store.goHome()">
          All rules
        </button>
        <NuxtLink to="/practice" class="inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100">
          Practice fractions
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
