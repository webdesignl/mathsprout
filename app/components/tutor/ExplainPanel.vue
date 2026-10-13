<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useTutorStore } from '../../stores/tutor'

const store = useTutorStore()
const MAX_CHARS = 500

const text = ref('')
const message = ref('')

// --- Optional microphone (Web Speech API). Only shown when the browser supports it. ---
interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
  resultIndex: number
}
interface Recognizer {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechResultEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
}
type RecognizerClass = new () => Recognizer

const Recognition: RecognizerClass | null =
  typeof window === 'undefined'
    ? null
    : ((window as unknown as { SpeechRecognition?: RecognizerClass; webkitSpeechRecognition?: RecognizerClass })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognizerClass }).webkitSpeechRecognition ??
      null)
const micSupported = Recognition !== null
const listening = ref(false)
let recognizer: Recognizer | null = null

function toggleMic() {
  if (!Recognition) return
  if (listening.value) {
    recognizer?.stop()
    return
  }
  recognizer = new Recognition()
  recognizer.lang = 'en-US'
  recognizer.interimResults = false
  recognizer.continuous = false
  recognizer.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]!
      if (result.isFinal) text.value = `${text.value} ${result[0]!.transcript}`.trim().slice(0, MAX_CHARS)
    }
  }
  recognizer.onend = () => {
    listening.value = false
  }
  recognizer.onerror = () => {
    listening.value = false
    message.value = 'I could not hear you. You can type instead.'
  }
  message.value = ''
  listening.value = true
  recognizer.start()
}

onBeforeUnmount(() => recognizer?.stop())

const followUpShown = computed(() => store.explanation.followUp !== '')

async function send() {
  if (!text.value.trim()) {
    message.value = 'Write or say a little about how you did it.'
    return
  }
  message.value = ''
  recognizer?.stop()
  const sent = await store.submitExplanation(text.value)
  // After a follow-up question she writes a fresh try.
  if (sent && store.state === 'explain') text.value = ''
}

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-xl font-bold'
</script>

<template>
  <section class="space-y-4">
    <label for="explain-box" class="block text-2xl font-bold text-slate-900">
      {{ followUpShown ? store.explanation.followUp : 'Tell me why your method works.' }}
    </label>

    <div role="status" aria-live="polite" class="space-y-2">
      <p v-if="store.explanation.praise && followUpShown" class="text-2xl font-bold text-emerald-900">
        {{ store.explanation.praise }}
      </p>
      <p v-if="store.busy === 'explain'" class="text-xl font-semibold text-slate-800">Thinking…</p>
      <p v-if="store.error" class="text-xl font-semibold text-red-800" role="alert">{{ store.error }}</p>
      <p v-if="message" class="text-xl font-semibold text-red-800" role="alert">{{ message }}</p>
    </div>

    <textarea
      id="explain-box"
      v-model="text"
      :maxlength="MAX_CHARS"
      rows="4"
      class="w-full rounded-xl border-2 border-slate-700 bg-white p-4 text-xl text-slate-900"
    />
    <p class="text-base text-slate-700">{{ text.length }} of {{ MAX_CHARS }}</p>

    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        :disabled="store.busy === 'explain'"
        :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-700']"
        @click="send"
      >
        Send
      </button>
      <button
        v-if="micSupported"
        type="button"
        :aria-pressed="listening"
        :class="[button, listening ? 'bg-red-800 text-white' : 'bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100']"
        @click="toggleMic"
      >
        {{ listening ? 'Stop listening' : 'Say it' }}
      </button>
      <button
        v-if="store.canSkipExplanation"
        type="button"
        :class="[button, 'bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100']"
        @click="store.skipExplanation()"
      >
        Skip
      </button>
    </div>
    <p v-if="micSupported" class="text-base text-slate-700">
      Your browser may send your voice to its speech service to turn it into words.
    </p>
  </section>
</template>
