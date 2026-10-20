<script setup lang="ts">
import { CHAPTERS, CHAPTER_OPS, GRADES, filterChapters, type ChapterOp } from '../../utils/chapters'
import { SET_SIZE } from '../../stores/practice'

const emit = defineEmits<{
  start: [setup: { ops: ChapterOp[]; needsRegroup: boolean; stories: boolean }]
}>()

const query = ref('')
const grade = ref(GRADES[0]!.value)
const shown = computed(() => filterChapters(query.value))

// The Fractions chapter's choices.
const ops = ref<ChapterOp[]>(['add'])
const needsRegroup = ref(false)
const stories = ref(true)
const error = ref('')

const allTicked = computed(() => ops.value.length === CHAPTER_OPS.length)
function toggleAll(event: Event) {
  ops.value = (event.target as HTMLInputElement).checked ? CHAPTER_OPS.map((o) => o.op) : []
}

function begin() {
  if (ops.value.length === 0) {
    error.value = 'Tick at least one: Add, Subtract, Multiply or Divide.'
    return
  }
  error.value = ''
  emit('start', {
    ops: ops.value,
    // Borrowing only makes sense when subtracting is ticked.
    needsRegroup: needsRegroup.value && ops.value.includes('subtract'),
    stories: stories.value,
  })
}

const check = 'flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold text-slate-900'
</script>

<template>
  <div class="space-y-5">
    <!-- Header: title, search and grade -->
    <header class="space-y-4 rounded-2xl bg-emerald-700 p-4 text-white sm:p-5">
      <div>
        <h1 class="text-3xl font-bold sm:text-4xl">Practice</h1>
        <p class="text-base text-emerald-50">Grade 4 · {{ CHAPTERS.filter((c) => c.ready).length }} chapter ready, more coming soon</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative min-w-0 flex-1 basis-40">
          <label for="chapter-search" class="sr-only">Search chapters</label>
          <svg class="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" focusable="false">
            <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
          </svg>
          <input
            id="chapter-search"
            v-model="query"
            type="search"
            autocomplete="off"
            placeholder="Search chapter"
            class="min-h-12 w-full rounded-xl border-2 border-transparent bg-white pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-600"
          >
        </div>
        <div>
          <label for="grade" class="sr-only">Grade</label>
          <select id="grade" v-model="grade" class="min-h-12 rounded-xl border-2 border-transparent bg-white px-3 text-base font-semibold text-slate-900">
            <option v-for="g in GRADES" :key="g.value" :value="g.value">{{ g.label }}</option>
          </select>
        </div>
      </div>
    </header>

    <!-- Nothing matches -->
    <div v-if="shown.length === 0" role="status" class="rounded-2xl bg-white p-5 text-center ring-1 ring-slate-200">
      <p class="text-xl font-bold text-slate-900">No results found</p>
      <p class="mt-1 text-base text-slate-700">
        No chapter matches “{{ query.trim() }}”. Try Fractions, Decimals or Place value.
      </p>
      <button type="button" class="mt-3 inline-flex min-h-11 items-center rounded-lg px-3 text-base font-semibold text-emerald-900 underline underline-offset-4" @click="query = ''">
        Clear search
      </button>
    </div>

    <!-- Chapters: 1 across on a phone, 3 on a tablet, 5 on a desktop -->
    <ul v-else class="grid items-start gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
      <li
        v-for="(chapter, i) in shown"
        :key="chapter.id"
        class="flex flex-col gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
        :class="chapter.ready ? '' : 'opacity-80'"
      >
        <div>
          <h2 class="text-xl font-bold text-slate-900">{{ i + 1 }}. {{ chapter.title }}</h2>
          <p class="text-base text-slate-700">{{ chapter.summary }}</p>
        </div>

        <template v-if="chapter.ready">
          <fieldset class="space-y-1">
            <legend class="sr-only">What to practice in {{ chapter.title }}</legend>
            <label v-for="o in CHAPTER_OPS" :key="o.op" :class="check">
              <input v-model="ops" type="checkbox" :value="o.op" class="size-6 accent-emerald-700">
              {{ o.label }}
            </label>
            <label :class="check">
              <input type="checkbox" :checked="allTicked" class="size-6 accent-emerald-700" @change="toggleAll">
              All
            </label>
            <label :class="check">
              <input v-model="stories" type="checkbox" class="size-6 accent-emerald-700">
              Word problems
            </label>
            <label v-if="ops.includes('subtract')" :class="check">
              <input v-model="needsRegroup" type="checkbox" class="size-6 accent-emerald-700">
              <span>Tricky regrouping <span class="block text-sm font-normal text-slate-700">Subtracting where you borrow</span></span>
            </label>
          </fieldset>
          <p v-if="error" role="alert" class="text-base font-semibold text-red-800">{{ error }}</p>
          <button
            type="button"
            class="mt-auto inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-4 text-lg font-bold text-white hover:bg-emerald-800"
            @click="begin"
          >
            Practice {{ SET_SIZE }} questions
          </button>
        </template>
        <p v-else class="mt-auto inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-base font-semibold text-slate-800">Coming soon</p>
      </li>
    </ul>
  </div>
</template>
