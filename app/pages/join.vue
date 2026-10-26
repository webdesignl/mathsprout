<script setup lang="ts">
import { authErrorMessage } from '../utils/friendlyErrors'
import { INVITE_MESSAGES, inviteErrorMessage, tokenFromHash } from '../utils/invite'

useHead({
  title: 'Join your family · MathSprout',
  // The link holds a secret, so keep this page out of search and do not leak the address to other sites.
  meta: [{ name: 'robots', content: 'noindex' }, { name: 'referrer', content: 'no-referrer' }],
})

const client = useSupabaseClient()
const user = useSupabaseUser()
const configured = useRuntimeConfig().public.supabaseConfigured
const { isValid } = useInvites()

const siteKey = String(useRuntimeConfig().public.turnstileSiteId ?? '')
const captchaToken = ref('')
const captcha = ref<{ reset: () => void } | null>(null)

const token = ref<string | null>(null)
const status = ref<'checking' | 'ok' | 'invalid'>('checking')
const email = ref('')
const password = ref('')
const again = ref('')
const busy = ref(false)
const error = ref('')
const checkEmail = ref(false)

onMounted(async () => {
  token.value = tokenFromHash(window.location.hash)
  // Take the secret out of the address bar and the history; it lives only in this page now.
  if (window.location.hash) window.history.replaceState(null, '', window.location.pathname)
  status.value = token.value && configured && (await isValid(token.value)) ? 'ok' : 'invalid'
})

async function submit() {
  if (busy.value || !token.value) return
  error.value = ''
  if (password.value !== again.value) {
    error.value = 'The two passwords are different.'
    return
  }
  if (siteKey && !captchaToken.value) {
    error.value = 'Please finish the check, then try again.'
    return
  }
  busy.value = true
  const { data, error: failure } = await client.auth.signUp({
    email: email.value.trim(),
    password: password.value,
    options: {
      data: { invite_token: token.value },
      captchaToken: captchaToken.value || undefined,
      emailRedirectTo: `${window.location.origin}/confirm`,
    },
  })
  busy.value = false
  if (failure) {
    if (import.meta.dev) console.warn('Supabase auth error:', failure.message)
    error.value = /database error|not valid/i.test(failure.message) ? inviteErrorMessage(failure) : authErrorMessage(failure)
    // A token works once, so ask for a new one.
    captchaToken.value = ''
    captcha.value?.reset()
    return
  }
  if (data.session) await navigateTo('/parent')
  else checkEmail.value = true
}

const field = 'min-h-12 w-full rounded-xl border-2 border-slate-600 bg-white px-4 text-base text-slate-900'
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <h1 class="text-[clamp(1.75rem,4vw+1rem,2.5rem)] font-bold text-emerald-900">Join your family</h1>

    <p v-if="status === 'checking'" role="status" class="text-lg text-slate-900">Checking your invite…</p>

    <section v-else-if="status === 'invalid'" class="space-y-3 rounded-2xl bg-white p-5">
      <p role="alert" class="text-lg font-semibold text-slate-900">{{ INVITE_MESSAGES.expired }}</p>
      <NuxtLink to="/login" class="inline-flex min-h-12 items-center text-lg font-semibold text-emerald-900 underline">Go to sign in</NuxtLink>
    </section>

    <section v-else-if="user" class="space-y-3 rounded-2xl bg-white p-5">
      <p role="status" class="text-lg text-slate-900">
        You are already signed in on this device. To join with a new account, sign out first, then open the link again.
      </p>
      <NuxtLink to="/parent" class="inline-flex min-h-12 items-center text-lg font-semibold text-emerald-900 underline">Go to Parent</NuxtLink>
    </section>

    <section v-else-if="checkEmail" class="space-y-3 rounded-2xl bg-white p-5">
      <p role="status" class="text-lg font-semibold text-slate-900">
        Almost there. We sent a message to {{ email }}. Open it to confirm your email, then sign in.
      </p>
      <NuxtLink to="/login" class="inline-flex min-h-12 items-center text-lg font-semibold text-emerald-900 underline">Go to sign in</NuxtLink>
    </section>

    <form v-else class="space-y-4 rounded-2xl bg-white p-5" @submit.prevent="submit">
      <p class="text-lg text-slate-700">You were invited to join a family on MathSprout. Make your account to join them.</p>
      <div class="space-y-1">
        <label for="join-email" class="text-base font-semibold text-slate-900">Email</label>
        <input id="join-email" v-model="email" type="email" autocomplete="email" required :class="field">
      </div>
      <div class="space-y-1">
        <label for="join-password" class="text-base font-semibold text-slate-900">Password (at least 8 characters)</label>
        <input id="join-password" v-model="password" type="password" autocomplete="new-password" minlength="8" required :class="field">
      </div>
      <div class="space-y-1">
        <label for="join-again" class="text-base font-semibold text-slate-900">Type the password again</label>
        <input id="join-again" v-model="again" type="password" autocomplete="new-password" minlength="8" required :class="field">
      </div>
      <TurnstileBox v-if="siteKey" ref="captcha" :site-key="siteKey" @token="captchaToken = $event; error = ''" @expired="captchaToken = ''" />
      <p v-if="error" role="alert" class="text-base font-semibold text-red-800">{{ error }}</p>
      <button
        type="submit"
        :disabled="busy"
        class="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-700 px-5 text-lg font-bold text-white hover:bg-emerald-800 focus-visible:outline-4 disabled:opacity-60"
      >
        {{ busy ? 'Joining…' : 'Join the family' }}
      </button>
      <p class="text-base text-slate-700">After you join, ask the parent for the family PIN to use parent mode.</p>
    </form>
  </div>
</template>
