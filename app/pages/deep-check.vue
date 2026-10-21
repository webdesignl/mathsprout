<script setup lang="ts">
import { ITEM_TYPES, RULE_GROUPS } from '../data/deepCheck'
import { useDeepCheckStore } from '../stores/deepCheck'
import { useChildStore } from '../stores/child'
import { useScratchStore } from '../stores/scratch'
import { challengesIn, challengesSolved, deepCheckProgress, MASTERED_STARS, ruleOf, rulesIn, typeLabel, type AttemptLine, type Grade } from '../utils/deepCheck'

useHead({ title: 'Deep Check · MathSprout' })

const store = useDeepCheckStore()
const scratch = useScratchStore()
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
    .select('mode, problem, correct, first_try')
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

// Rough work, the same pad as in Practice: one drawing per question or challenge, kept while the tab stays open.
const canDraw = computed(() => (store.view === 'quiz' && store.current !== null) || (store.view === 'challenge' && store.challenge !== undefined))
const showPad = computed(() => scratch.open && canDraw.value)
const padKey = computed(() => (store.view === 'quiz' ? `dc-${store.current?.id}` : `dc-${store.challenge?.id}`))
// Back on the rules page, the old scribbles are cleared.
watch(() => store.view, (view) => view === 'home' && scratch.reset())
const solvedChallenges = computed(() => challengesSolved(lines.value))

// Each topic starts folded, so she sees every topic heading at once and opens only the one she wants.
// What is open is kept for the visit (not for good), so coming back from a quiz lands in the same place.
const OPEN_KEY = 'mathsprout.deepCheckOpen'
const open = reactive<Record<string, boolean>>({})
onMounted(() => {
  try {
    Object.assign(open, JSON.parse(window.sessionStorage.getItem(OPEN_KEY) ?? '{}'))
  } catch {
    // Storage may be blocked; everything just starts folded.
  }
})
function toggle(key: string) {
  open[key] = !open[key]
  try {
    window.sessionStorage.setItem(OPEN_KEY, JSON.stringify(open))
  } catch {
    // Not remembered; that is fine.
  }
}
function masteredIn(groupId: string) {
  return rulesIn(groupId).filter((r) => (progress.value[r.id]?.stars ?? 0) === MASTERED_STARS).length
}
function solvedIn(groupId: string) {
  return challengesIn(groupId).filter((c) => solvedChallenges.value.has(c.id)).length
}

function onChallenge(values: Record<string, string | number>, hintsUsed: number) {
  store.submitChallenge(values, hintsUsed)
}

/** The rule shown inside the quiz after a wrong answer, so she does not lose her place. */
const ruleOpen = ref(false)
watch(() => [store.current?.id, store.view], () => (ruleOpen.value = false))
const ruleOfCurrent = computed(() => (store.current ? ruleOf(store.current.ruleId) : undefined))

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
  <div :class="['mx-auto', showPad ? 'max-w-7xl lg:grid lg:grid-cols-[minmax(0,1fr)_34rem] lg:items-start lg:gap-8' : 'max-w-4xl']">
    <div :class="['min-w-0 space-y-6', showPad ? 'pb-[60vh] lg:pb-0' : '']">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-3xl font-bold text-emerald-900 sm:text-4xl">{{ heading }}</h1>
      <div v-if="store.view !== 'home'" class="flex flex-wrap items-center gap-2">
        <button
          v-if="canDraw"
          type="button"
          aria-controls="rough-work"
          :aria-expanded="showPad"
          class="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-4 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100"
          @click="scratch.toggle()"
        >
          <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
            <path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z" stroke-linejoin="round" />
          </svg>
          Rough work
        </button>
        <button
          type="button"
          class="inline-flex min-h-12 items-center rounded-xl bg-white px-4 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100"
          @click="store.goHome()"
        >
          All rules
        </button>
      </div>
    </div>

    <!-- Home: choose a rule, or the chapter quiz -->
    <template v-if="store.view === 'home'">
      <p class="text-lg text-slate-900">
        Fun quizzes to check you really understand the ideas, before a chapter test. Learn the picture first, then try 5 quick
        questions. There is no timer, and every answer teaches you something.
      </p>

      <section v-for="group in RULE_GROUPS" :key="group.id" class="rounded-2xl bg-white ring-1 ring-slate-200">
        <!-- The topic heading opens and folds its rules. The chapter quiz is right beside it. -->
        <div class="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
          <button
            type="button"
            class="flex min-h-12 min-w-0 flex-1 basis-36 items-center gap-2 rounded-xl px-1 text-left hover:bg-emerald-50"
            :aria-expanded="Boolean(open[group.id])"
            :aria-controls="`topic-${group.id}`"
            @click="toggle(group.id)"
          >
            <svg class="size-6 shrink-0 text-emerald-800 transition-transform" :class="open[group.id] ? 'rotate-90' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <path d="M9 6l6 6-6 6" />
            </svg>
            <span class="min-w-0">
              <span class="block text-lg font-bold leading-snug text-emerald-900 sm:text-2xl">{{ group.title }}</span>
              <span class="block text-sm text-slate-700 sm:text-base">
                <template v-if="rulesIn(group.id).length === 0">Coming soon</template>
                <template v-else>
                  {{ rulesIn(group.id).length }} rules · {{ masteredIn(group.id) }} mastered
                </template>
              </span>
            </span>
          </button>
          <button
            v-if="rulesIn(group.id).length"
            type="button"
            class="inline-flex min-h-12 shrink-0 items-center rounded-xl bg-emerald-700 px-4 text-base font-bold text-white hover:bg-emerald-800 sm:px-5 sm:text-lg"
            :aria-label="`Chapter quiz: ${group.title}`"
            @click="store.startChapter(group.id)"
          >
            Chapter quiz
          </button>
        </div>

        <!-- Olympiad challenges: right under the topic heading, folded, so she does not scroll past the rules to find them -->
        <div v-if="challengesIn(group.id).length" class="border-t border-slate-200">
          <button
            type="button"
            class="flex min-h-12 w-full items-center gap-3 px-4 text-left hover:bg-emerald-50 sm:px-5"
            :aria-expanded="Boolean(open[`${group.id}-challenges`])"
            :aria-controls="`challenges-${group.id}`"
            @click="toggle(`${group.id}-challenges`)"
          >
            <svg class="size-5 shrink-0 text-emerald-800 transition-transform" :class="open[`${group.id}-challenges`] ? 'rotate-90' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <path d="M9 6l6 6-6 6" />
            </svg>
            <span class="text-lg font-bold text-emerald-900">Olympiad challenges</span>
            <span class="text-sm text-slate-700 sm:text-base">{{ solvedIn(group.id) }} of {{ challengesIn(group.id).length }} solved</span>
          </button>
          <ul v-if="open[`${group.id}-challenges`]" :id="`challenges-${group.id}`" class="grid gap-3 p-3 pt-1 sm:grid-cols-2 sm:p-4 sm:pt-1">
            <li v-for="c in challengesIn(group.id)" :key="c.id" class="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
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

        <div v-if="open[group.id] && rulesIn(group.id).length" :id="`topic-${group.id}`" class="space-y-4 border-t border-slate-200 p-3 sm:p-4">
          <p class="text-base text-slate-700">{{ group.summary }}</p>

          <ul class="grid gap-3 sm:grid-cols-2">
            <li v-for="rule in rulesIn(group.id)" :key="rule.id" class="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
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

        </div>
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

      <!-- One hint, only before she answers -->
      <div v-if="!store.feedback" class="space-y-2">
        <button
          v-if="!store.hintShown"
          type="button"
          class="inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100"
          @click="store.showHint()"
        >
          Need a hint?
        </button>
        <p v-else role="status" class="rounded-2xl bg-amber-50 p-4 text-lg text-amber-950 ring-1 ring-amber-200">
          <span class="font-semibold">Hint:</span> {{ store.current.hint }}
        </p>
      </div>

      <div v-if="store.feedback" role="status" class="space-y-3 rounded-2xl p-4 ring-2" :class="store.feedback.correct ? 'bg-emerald-50 ring-emerald-500' : 'bg-amber-50 ring-amber-400'">
        <p class="text-xl font-bold" :class="store.feedback.correct ? 'text-emerald-900' : 'text-amber-950'">
          {{ store.feedback.correct ? 'Yes! That’s right.' : 'Not quite. Here’s the idea.' }}
        </p>
        <p v-if="store.feedback.correct && store.feedback.usedHint" class="text-lg text-slate-900">
          You used the hint, so this one does not earn a star yet. Try it again later without the hint.
        </p>
        <p v-if="store.feedback.message" class="text-lg text-slate-900">{{ store.feedback.message }}</p>
        <p class="text-lg text-slate-900">{{ store.feedback.explanation }}</p>
        <div class="flex flex-wrap gap-3">
          <button type="button" class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-6 text-lg font-bold text-white hover:bg-emerald-800" @click="store.next()">
            {{ store.isLast ? 'See my result' : 'Next question' }}
          </button>
          <button
            v-if="!store.feedback.correct && ruleOfCurrent"
            type="button"
            class="inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100"
            :aria-expanded="ruleOpen"
            @click="ruleOpen = !ruleOpen"
          >
            {{ ruleOpen ? 'Hide the rule' : `Look at the rule: ${ruleOfCurrent.title}` }}
          </button>
        </div>
      </div>

      <div v-if="ruleOpen && ruleOfCurrent" class="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
        <DeepCheckLearnPanel :rule="ruleOfCurrent" compact @close="ruleOpen = false" />
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

    <!-- Rough work: beside the question on wide screens, a bottom sheet on narrow ones. -->
    <aside
      v-if="showPad"
      id="rough-work"
      aria-label="Rough work"
      class="fixed inset-x-0 bottom-0 z-20 max-h-[60vh] overflow-y-auto rounded-t-2xl border-t-4 border-slate-700 bg-emerald-50 p-4 shadow-2xl lg:sticky lg:top-24 lg:max-h-none lg:self-start lg:overflow-visible lg:rounded-2xl lg:border-4 lg:shadow-md"
    >
      <PracticeScratchPad :page-key="padKey" @close="scratch.toggle()" />
    </aside>
  </div>
</template>
