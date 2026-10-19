<script setup lang="ts">
import { appendDigit, canSubmitPin, maskPin, removeLastDigit } from '../../utils/pin'

defineProps<{ title: string; error?: string; busy?: boolean }>()
const emit = defineEmits<{ submit: [pin: string] }>()

// The PIN lives only here while it is typed. It is cleared as soon as it is sent.
const pin = ref('')

function press(key: string) {
  pin.value = appendDigit(pin.value, key)
}
function submit() {
  if (!canSubmitPin(pin.value)) return
  emit('submit', pin.value)
  pin.value = ''
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'Backspace') pin.value = removeLastDigit(pin.value)
  else if (event.key === 'Enter') submit()
  else if (/^[0-9]$/.test(event.key)) press(event.key)
  else return
  event.preventDefault()
}

const key = 'inline-flex min-h-14 items-center justify-center rounded-xl bg-white text-2xl font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100'
</script>

<template>
  <div class="mx-auto max-w-xs space-y-4 rounded-2xl bg-white p-5" role="group" :aria-label="title" tabindex="0" @keydown="onKey">
    <h2 class="text-2xl font-bold text-slate-900">{{ title }}</h2>
    <p class="min-h-12 text-center text-3xl tracking-widest text-slate-900" role="status" :aria-label="`${pin.length} digits entered`">
      {{ maskPin(pin) || '—' }}
    </p>
    <p v-if="error" role="alert" class="text-lg font-semibold text-red-800">{{ error }}</p>
    <div class="grid grid-cols-3 gap-2">
      <button v-for="n in ['1', '2', '3', '4', '5', '6', '7', '8', '9']" :key="n" type="button" :class="key" :aria-label="`Digit ${n}`" @click="press(n)">
        {{ n }}
      </button>
      <button type="button" :class="key" aria-label="Clear all digits" @click="pin = ''">Clear</button>
      <button type="button" :class="key" aria-label="Digit 0" @click="press('0')">0</button>
      <button
        type="button"
        aria-label="Enter PIN"
        :disabled="busy || !canSubmitPin(pin)"
        class="inline-flex min-h-14 items-center justify-center rounded-xl bg-emerald-700 text-xl font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
        @click="submit"
      >
        Enter
      </button>
    </div>
  </div>
</template>
