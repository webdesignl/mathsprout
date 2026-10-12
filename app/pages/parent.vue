<script setup lang="ts">
import { computed } from 'vue'
import { usePracticeStore } from '../stores/practice'

useHead({ title: 'Parent · MathSprout' })

const store = usePracticeStore()

const pending = computed(() => store.ideaReviews.filter((r) => r.approved === null))
const reviewed = computed(() => store.ideaReviews.filter((r) => r.approved !== null))
const stars = computed(() => store.ideaReviews.filter((r) => r.approved === true).length)

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-lg font-bold'
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-8">
    <div class="space-y-2">
      <h1 class="text-4xl font-bold text-emerald-900">Parent corner</h1>
      <p class="text-xl text-slate-900">
        Your child shared real-life uses for fractions. Give a star for each idea that makes sense.
      </p>
      <p class="text-lg text-slate-700">Reviews are kept only while this tab stays open.</p>
    </div>

    <p v-if="store.ideaReviews.length === 0" class="rounded-2xl bg-white p-5 text-xl text-slate-900">
      Nothing to review yet. Ideas show up here after your child finishes a set.
    </p>

    <section v-if="pending.length" aria-labelledby="to-review" class="space-y-3">
      <h2 id="to-review" class="text-2xl font-bold">To review ({{ pending.length }})</h2>
      <ul class="space-y-3">
        <li v-for="idea in pending" :key="idea.id" class="space-y-3 rounded-2xl bg-white p-5">
          <p class="text-lg text-slate-700">Set {{ idea.set }}</p>
          <p class="text-2xl text-slate-900">{{ idea.text }}</p>
          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800']"
              :aria-label="`Give a star for: ${idea.text}`"
              @click="store.reviewIdea(idea.id, true)"
            >
              <span aria-hidden="true">⭐</span>&nbsp;Give a star
            </button>
            <button
              type="button"
              :class="[button, 'bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100']"
              :aria-label="`No star this time for: ${idea.text}`"
              @click="store.reviewIdea(idea.id, false)"
            >
              Not this time
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="reviewed.length" aria-labelledby="done" class="space-y-3">
      <h2 id="done" class="text-2xl font-bold">
        Reviewed ({{ reviewed.length }}) · {{ stars }} {{ stars === 1 ? 'star' : 'stars' }} given
      </h2>
      <ul class="space-y-3">
        <li
          v-for="idea in reviewed"
          :key="idea.id"
          class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5"
        >
          <div>
            <p class="text-lg text-slate-700">Set {{ idea.set }}</p>
            <p class="text-xl text-slate-900">{{ idea.text }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-lg font-semibold" :class="idea.approved ? 'text-amber-900' : 'text-slate-700'">
              <span v-if="idea.approved"><span aria-hidden="true">⭐</span> Star given</span>
              <span v-else>No star</span>
            </span>
            <button
              type="button"
              :class="[button, 'bg-white text-emerald-900 ring-2 ring-emerald-700 hover:bg-emerald-50']"
              :aria-label="`${idea.approved ? 'Take back the star' : 'Give a star'} for: ${idea.text}`"
              @click="store.reviewIdea(idea.id, !idea.approved)"
            >
              {{ idea.approved ? 'Take back' : 'Give a star' }}
            </button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
