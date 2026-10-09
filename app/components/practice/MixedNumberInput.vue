<script setup lang="ts">
import { ref } from 'vue'
import type { AnswerBoxes } from '../../utils/answer'

const model = defineModel<AnswerBoxes>({ required: true })
const emit = defineEmits<{ submit: [] }>()

const wholeBox = ref<HTMLInputElement | null>(null)

/** Keeps digits only, so the child can't type letters or symbols. */
function onInput(field: keyof AnswerBoxes, event: Event) {
  const target = event.target as HTMLInputElement
  const digits = target.value.replace(/\D/g, '')
  target.value = digits
  model.value = { ...model.value, [field]: digits }
}

function focus() {
  wholeBox.value?.focus()
}
defineExpose({ focus })

const box =
  'h-20 rounded-xl border-2 border-slate-700 bg-white text-center text-4xl font-bold text-slate-900 placeholder:text-slate-400'
</script>

<template>
  <div role="group" aria-label="Your answer" class="flex items-center justify-center gap-4">
    <input
      ref="wholeBox"
      :value="model.whole"
      type="text"
      inputmode="numeric"
      autocomplete="off"
      maxlength="2"
      aria-label="Whole number"
      :class="[box, 'w-24']"
      @input="onInput('whole', $event)"
      @keydown.enter.prevent="emit('submit')"
    />
    <div class="flex flex-col items-center gap-1">
      <input
        :value="model.num"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        maxlength="3"
        aria-label="Numerator, the top number of the fraction"
        :class="[box, 'h-16 w-24']"
        @input="onInput('num', $event)"
        @keydown.enter.prevent="emit('submit')"
      />
      <div class="h-1 w-24 rounded bg-slate-900" aria-hidden="true" />
      <input
        :value="model.den"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        maxlength="3"
        aria-label="Denominator, the bottom number of the fraction"
        :class="[box, 'h-16 w-24']"
        @input="onInput('den', $event)"
        @keydown.enter.prevent="emit('submit')"
      />
    </div>
  </div>
</template>
