<script setup lang="ts">
import { FEEDBACK_WHO, MAX_FEEDBACK_MESSAGE, RATING_WORDS, type FeedbackWho } from '../utils/feedback'

/**
 * A short feedback form in a native dialog (focus stays inside, Escape closes it).
 * "ending" is the version shown when someone ends the demo: it offers "Skip and end demo".
 */
const props = defineProps<{ open: boolean; ending: boolean }>()
const emit = defineEmits<{ close: []; finished: [] }>()

const { send, sending, error } = useFeedback()
const dialog = ref<HTMLDialogElement | null>(null)
const rating = ref(0)
const who = ref<FeedbackWho | ''>('')
const message = ref('')
const sent = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) {
      rating.value = 0
      who.value = ''
      message.value = ''
      sent.value = false
      error.value = ''
      if (!dialog.value?.open) dialog.value?.showModal()
    } else if (dialog.value?.open) {
      dialog.value.close()
    }
  },
)

async function submit() {
  if (await send({ rating: rating.value, who: who.value, message: message.value })) sent.value = true
}

const field = 'mt-1 block min-h-11 w-full rounded-xl border-2 border-slate-600 bg-white px-3 py-2 text-base text-slate-900'
const primary = 'inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-5 text-lg font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400'
const secondary = 'inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100'
</script>

<template>
  <dialog
    ref="dialog"
    aria-labelledby="feedback-title"
    class="m-auto max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-2xl border-4 border-slate-700 bg-emerald-50 p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/60"
    @cancel.prevent="emit('close')"
    @close="props.open && emit('close')"
  >
    <div v-if="sent" class="space-y-4 p-5 text-center">
      <h2 id="feedback-title" class="text-2xl font-bold">Thank you!</h2>
      <p class="text-lg">Your feedback was sent. It really helps.</p>
      <button type="button" :class="primary" autofocus @click="ending ? emit('finished') : emit('close')">
        {{ ending ? 'End demo' : 'Close' }}
      </button>
    </div>

    <form v-else class="space-y-4 p-5" @submit.prevent="submit">
      <h2 id="feedback-title" class="text-2xl font-bold">{{ ending ? 'Before you go: how was the demo?' : 'How is the demo?' }}</h2>

      <fieldset>
        <legend class="text-lg font-semibold">Your rating</legend>
        <div class="mt-1 flex gap-1" role="radiogroup" aria-label="Rating from 1 to 5 stars">
          <label
            v-for="n in 5"
            :key="n"
            class="relative inline-flex size-12 cursor-pointer items-center justify-center rounded-xl text-3xl has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-slate-900"
          >
            <input v-model.number="rating" type="radio" name="rating" :value="n" class="absolute inset-0 size-full cursor-pointer opacity-0" :aria-label="`${n} ${n === 1 ? 'star' : 'stars'}: ${RATING_WORDS[n]}`" />
            <span aria-hidden="true" :class="n <= rating ? 'text-amber-500' : 'text-slate-400'">{{ n <= rating ? '★' : '☆' }}</span>
          </label>
        </div>
        <p class="mt-1 min-h-6 text-base text-slate-700" aria-live="polite">{{ RATING_WORDS[rating] ?? '' }}</p>
      </fieldset>

      <div>
        <label for="feedback-who" class="text-lg font-semibold">I am… <span class="font-normal text-slate-700">(optional)</span></label>
        <select id="feedback-who" v-model="who" :class="field">
          <option value="">Prefer not to say</option>
          <option v-for="o in FEEDBACK_WHO" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <div>
        <label for="feedback-message" class="text-lg font-semibold">What worked? What was confusing? <span class="font-normal text-slate-700">(optional)</span></label>
        <textarea id="feedback-message" v-model="message" rows="4" :maxlength="MAX_FEEDBACK_MESSAGE" :class="field" aria-describedby="feedback-hint" />
        <p id="feedback-hint" class="mt-1 text-base text-slate-700">Please don’t type your name, email or any personal details.</p>
      </div>

      <p v-if="error" role="alert" class="text-base font-semibold text-red-900">{{ error }}</p>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" :class="secondary" @click="ending ? emit('finished') : emit('close')">
          {{ ending ? 'Skip and end demo' : 'Cancel' }}
        </button>
        <button type="submit" :class="primary" :disabled="rating === 0 || sending">
          {{ sending ? 'Sending…' : 'Send feedback' }}
        </button>
      </div>
    </form>
  </dialog>
</template>
