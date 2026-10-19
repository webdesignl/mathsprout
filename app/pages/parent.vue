<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useChildStore } from '../stores/child'
import PinPad from '../components/parent/PinPad.vue'
import FamilyManager from '../components/parent/FamilyManager.vue'
import IdeaReviews from '../components/parent/IdeaReviews.vue'

useHead({ title: 'Parent · MathSprout' })

const childStore = useChildStore()
const client = useSupabaseClient()
const parent = useParentMode()

const pinError = ref('')
const pinBusy = ref(false)
/** First PIN typed while choosing a new one; it is compared with the second and then dropped. */
const firstPin = ref<string | null>(null)
const resetting = ref(false)

onMounted(() => parent.refresh())
onBeforeUnmount(() => parent.stopTimer())

const pinTitle = computed(() => {
  if (parent.hasPin.value) return resetting.value ? (firstPin.value ? 'Type the new PIN again' : 'Choose a new PIN') : 'Enter your parent PIN'
  return firstPin.value ? 'Type the PIN again to confirm' : 'Choose a parent PIN (4 to 6 numbers)'
})

const countdown = computed(() => {
  const s = parent.secondsLeft.value
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})

async function onPin(pin: string) {
  pinError.value = ''
  const choosing = !parent.hasPin.value || resetting.value
  if (choosing) {
    if (firstPin.value === null) {
      firstPin.value = pin
      return
    }
    const same = firstPin.value === pin
    firstPin.value = null
    if (!same) {
      pinError.value = 'The two PINs were different. Try again.'
      return
    }
    pinBusy.value = true
    const result = parent.hasPin.value ? await parent.resetPin(pin) : await parent.setPin(pin)
    pinBusy.value = false
    if (!result.ok) pinError.value = result.error
    else resetting.value = false
    return
  }
  pinBusy.value = true
  const result = await parent.unlock(pin)
  pinBusy.value = false
  if (!result.ok) pinError.value = result.error
}

async function signOut() {
  await parent.lock()
  childStore.select(null)
  await client.auth.signOut()
  await navigateTo('/login')
}

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-lg font-bold'
</script>

<template>
  <div v-if="parent.hasPin.value === null" class="mx-auto max-w-3xl">
    <p role="status" class="text-xl text-slate-900">Loading…</p>
  </div>
  <div v-else-if="!parent.unlocked.value" class="mx-auto max-w-3xl space-y-4">
    <PinPad :title="pinTitle" :error="pinError" :busy="pinBusy" @submit="onPin" />
    <div v-if="parent.hasPin.value === true" class="mx-auto max-w-xs space-y-2 text-center text-lg text-slate-700">
      <p>
        Forgot the PIN? Sign out, then sign in again with your password. Within 10 minutes, tap
        “Reset PIN” here.
      </p>
      <button type="button" class="min-h-12 font-semibold text-emerald-900 underline" @click="resetting = !resetting; firstPin = null; pinError = ''">
        {{ resetting ? 'Back to entering my PIN' : 'Reset PIN' }}
      </button>
    </div>
    <div class="text-center">
      <button type="button" class="min-h-12 text-lg font-semibold text-emerald-900 underline" @click="signOut">Sign out</button>
    </div>
  </div>
  <div v-else class="mx-auto max-w-3xl space-y-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-lg text-slate-700" role="timer">Parent mode ends in {{ countdown }}</p>
      <button type="button" :class="[button, 'bg-white text-slate-900 ring-2 ring-slate-600']" @click="parent.lock()">Lock now</button>
    </div>

    <FamilyManager />

    <IdeaReviews />
  </div>
</template>
