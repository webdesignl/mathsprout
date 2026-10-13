<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AnyOp } from '../../utils/fraction'
import { opsPhrase } from '../../utils/messages'
import type { UnlockCard } from '../../utils/realWorld'
import { MAX_EXAMPLES } from '../../utils/realWorld'

const props = defineProps<{
  /** Empty until she has answered; then the three knowledge cards to reveal. */
  cards: UnlockCard[]
  submitted: boolean
  /** The operations in this set, so the question is about the ones she practiced. */
  ops: AnyOp[]
}>()
const emit = defineEmits<{ submit: [ideas: string[]]; skip: []; continue: [] }>()

/** How many of the cards are her own ideas (a parent gives the stars for these). */
const phrase = computed(() => opsPhrase(props.ops))
const mineCount = computed(() => props.cards.filter((c) => c.mine).length)

const ideas = ref<string[]>(Array.from({ length: MAX_EXAMPLES }, () => ''))

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-xl font-bold'
const topicLabel: Record<string, string> = {
  kitchen: 'In the kitchen',
  building: 'Building things',
  sport: 'Sports and trails',
  art: 'Art and crafts',
  time: 'Your time',
  shopping: 'Shopping',
  'your idea': 'Your idea',
}
</script>

<template>
  <section v-if="!submitted" class="space-y-6">
    <h1 class="text-4xl font-bold text-emerald-900">Where would you use {{ phrase }} fractions?</h1>
    <p class="text-xl text-slate-900">
      Share up to {{ MAX_EXAMPLES }} real-life ideas. A parent can give you stars.
    </p>

    <form class="space-y-4" @submit.prevent="emit('submit', ideas)">
      <div v-for="(_, i) in ideas" :key="i" class="space-y-1">
        <label :for="`idea-${i}`" class="text-xl font-semibold text-slate-900">Idea {{ i + 1 }}</label>
        <input
          :id="`idea-${i}`"
          v-model="ideas[i]"
          type="text"
          maxlength="200"
          autocomplete="off"
          class="min-h-14 w-full rounded-xl border-2 border-slate-700 bg-white px-4 text-xl text-slate-900"
        />
      </div>
      <div class="flex flex-wrap gap-3">
        <button type="submit" :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800']">
          Share my ideas
        </button>
        <button
          type="button"
          :class="[button, 'bg-white text-emerald-900 ring-2 ring-emerald-700 hover:bg-emerald-50']"
          @click="emit('skip')"
        >
          Show me ideas
        </button>
      </div>
    </form>
  </section>

  <section v-else class="space-y-6" aria-live="polite">
    <h1 class="text-4xl font-bold text-emerald-900">
      <span aria-hidden="true">🔓</span> Knowledge unlocked!
    </h1>
    <p v-if="mineCount > 0" class="stars text-2xl font-semibold text-amber-900">
      <span aria-hidden="true">⭐</span>
      {{ mineCount === 1 ? 'Your idea is' : 'Your ideas are' }} waiting for a parent to give stars.
    </p>
    <p v-else class="text-2xl text-slate-900">Here are some ideas to keep.</p>

    <ul class="space-y-3">
      <li
        v-for="(card, i) in cards"
        :key="i"
        class="card rounded-2xl border-2 p-5"
        :class="card.mine ? 'border-amber-600 bg-amber-100' : 'border-emerald-700 bg-white'"
        :style="{ animationDelay: `${i * 0.25}s` }"
      >
        <p class="text-lg font-bold" :class="card.mine ? 'text-amber-950' : 'text-emerald-900'">
          <span aria-hidden="true">🔓</span> {{ topicLabel[card.topic] ?? card.topic }}
        </p>
        <p class="mt-1 text-xl text-slate-900">{{ card.text }}</p>
      </li>
    </ul>

    <button type="button" :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800']" @click="emit('continue')">
      See my results
    </button>
  </section>
</template>

<style scoped>
@media (prefers-reduced-motion: no-preference) {
  .card {
    animation: reveal 0.5s ease-out both;
  }
  .stars {
    animation: reveal 0.6s ease-out both;
  }
}
@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
