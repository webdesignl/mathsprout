<script setup lang="ts">
import type { Rule } from '../../data/deepCheck'

defineProps<{ rule: Rule; /** Shown inside a quiz: no quiz or back buttons, just a close button. */ compact?: boolean }>()
const emit = defineEmits<{ quiz: []; back: []; close: [] }>()
</script>

<template>
  <section class="space-y-5" :aria-labelledby="`learn-${rule.id}`">
    <div class="space-y-1">
      <p class="text-base font-semibold text-emerald-800">Learn · {{ rule.id }}</p>
      <h2 :id="`learn-${rule.id}`" class="text-3xl font-bold text-emerald-900">{{ rule.title }}</h2>
    </div>

    <p class="rounded-2xl bg-white p-4 text-xl text-slate-900 ring-1 ring-slate-200">{{ rule.statement }}</p>

    <p class="rounded-2xl bg-amber-50 p-4 text-lg text-amber-950 ring-1 ring-amber-200">
      <span class="font-semibold">Watch out for this idea:</span> {{ rule.misconception }}
    </p>

    <div v-for="(frame, i) in rule.frames" :key="i" class="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <DeepCheckBarModel v-if="frame.kind === 'bars'" :rows="frame.rows" />
      <DeepCheckNumberLine v-else-if="frame.kind === 'line'" :max="frame.max" :marks="frame.marks" :gap="frame.gap" />
      <DeepCheckAreaModel
        v-else-if="frame.kind === 'area'"
        :cols="frame.cols"
        :rows="frame.rows"
        :a="frame.a"
        :b="frame.b"
        :a-label="frame.aLabel"
        :b-label="frame.bLabel"
        :both-label="frame.bothLabel"
      />
      <DeepCheckJumpLine v-else-if="frame.kind === 'jumps'" :parts="frame.parts" :target="frame.target" :top="frame.top" :arcs="frame.arcs" />
      <div v-else-if="frame.kind === 'steps'" class="space-y-2">
        <p class="text-xl font-bold text-slate-900">{{ frame.title }}</p>
        <p
          v-for="(line, i) in frame.lines"
          :key="i"
          class="rounded-lg p-3 text-lg font-semibold"
          :class="line.tone === 'wrong' ? 'bg-rose-50 text-rose-950' : line.tone === 'right' ? 'bg-emerald-50 text-emerald-950' : 'bg-slate-50 text-slate-900'"
        >
          <span aria-hidden="true">{{ line.tone === 'wrong' ? '✗ ' : line.tone === 'right' ? '✓ ' : '' }}</span>{{ line.text }}
        </p>
      </div>
      <DeepCheckReciprocalFlow v-else :steps="frame.steps" :result="frame.result" :balance="frame.balance" />
      <p class="text-lg text-slate-900">{{ frame.caption }}</p>
    </div>

    <div v-if="compact" class="flex flex-wrap gap-3">
      <button type="button" class="inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100" @click="emit('close')">
        Close the rule
      </button>
    </div>
    <div v-else class="flex flex-wrap gap-3">
      <button type="button" class="inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-6 text-lg font-bold text-white hover:bg-emerald-800" @click="emit('quiz')">
        Start the fun quiz
      </button>
      <button type="button" class="inline-flex min-h-12 items-center rounded-xl bg-white px-5 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100" @click="emit('back')">
        Back to rules
      </button>
    </div>
  </section>
</template>
