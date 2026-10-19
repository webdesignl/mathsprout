<script setup lang="ts">
import { authErrorMessage } from '../utils/friendlyErrors'

useHead({ title: 'Parent sign in · MathSprout' })

const client = useSupabaseClient()
const user = useSupabaseUser()

const email = ref('')
const password = ref('')
const familyName = ref('')
const childName = ref('')
const creating = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')

watch(
  user,
  (value) => {
    if (value) void navigateTo('/parent')
  },
  { immediate: true },
)

async function forgot() {
  error.value = ''
  notice.value = ''
  if (!email.value.trim()) {
    error.value = 'Type your email above first.'
    return
  }
  const { error: failure } = await client.auth.resetPasswordForEmail(email.value.trim(), {
    redirectTo: `${window.location.origin}/confirm`,
  })
  if (failure) error.value = authErrorMessage(failure)
  else notice.value = 'If that email has an account, we sent a link to reset the password.'
}

async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  const credentials = { email: email.value.trim(), password: password.value }
  const { data, error: failure } = creating.value
    ? await client.auth.signUp({ ...credentials, options: { emailRedirectTo: `${window.location.origin}/confirm`,
          data: { family_name: familyName.value.trim(), child_nickname: childName.value.trim() },
        },
      })
    : await client.auth.signInWithPassword(credentials)
  busy.value = false
  if (failure) {
    if (import.meta.dev) console.warn('Supabase auth error:', failure.message)
    error.value = authErrorMessage(failure)
  } else if (creating.value && data.user?.identities?.length === 0) {
    // Supabase hides whether an email exists; an empty identities list means it does, and no email is sent.
    error.value = authErrorMessage({ message: 'User already registered' })
  } else if (creating.value && !data.session) {
    notice.value = 'Check your email to confirm.'
  }
}

const field = 'min-h-12 w-full rounded-xl border-2 border-slate-600 bg-white px-4 text-xl text-slate-900'
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <h1 class="text-4xl font-bold text-emerald-900">Parent account</h1>
    <div role="tablist" aria-label="Sign in or create account" class="flex gap-2">
      <button
        v-for="tab in [{ label: 'Sign in', value: false }, { label: 'Create account', value: true }]"
        :key="tab.label"
        type="button"
        role="tab"
        :aria-selected="creating === tab.value"
        class="min-h-12 flex-1 rounded-xl px-4 text-lg font-bold"
        :class="creating === tab.value ? 'bg-emerald-700 text-white' : 'bg-white text-slate-900 ring-2 ring-slate-600'"
        @click="creating = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>
    <p class="text-xl text-slate-900">Your child does not need an account. This is only for you.</p>

    <form class="space-y-4 rounded-2xl bg-white p-5" @submit.prevent="submit">
      <template v-if="creating">
        <div class="space-y-1">
          <label for="family" class="text-lg font-semibold text-slate-900">Family name</label>
          <input id="family" v-model="familyName" maxlength="60" required autocomplete="off" :class="field">
        </div>
        <div class="space-y-1">
          <label for="child" class="text-lg font-semibold text-slate-900">Child’s nickname</label>
          <input id="child" v-model="childName" maxlength="30" required autocomplete="off" :class="field">
          <p class="text-base text-slate-700">A nickname only, not a full name.</p>
        </div>
      </template>
      <div class="space-y-1">
        <label for="email" class="text-lg font-semibold text-slate-900">Email</label>
        <input id="email" v-model="email" type="email" autocomplete="email" required :class="field">
      </div>
      <div class="space-y-1">
        <label for="password" class="text-lg font-semibold text-slate-900">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          :autocomplete="creating ? 'new-password' : 'current-password'"
          minlength="6"
          required
          :class="field"
        >
      </div>
      <p v-if="error" role="alert" class="text-lg font-semibold text-red-800">{{ error }}</p>
      <p v-if="notice" role="status" class="text-lg font-semibold text-emerald-900">{{ notice }}</p>
      <button
        type="submit"
        :disabled="busy"
        class="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-700 px-5 text-lg font-bold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {{ creating ? 'Create account' : 'Sign in' }}
      </button>
    </form>

    <button v-if="!creating" type="button" class="min-h-12 text-lg font-semibold text-emerald-900 underline" @click="forgot">
      Forgot password?
    </button>
  </div>
</template>
