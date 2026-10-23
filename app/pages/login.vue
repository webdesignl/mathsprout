<script setup lang="ts">
import { authErrorMessage } from '../utils/friendlyErrors'

useHead({ title: 'Parent sign in · MathSprout' })

const client = useSupabaseClient()
const configured = useRuntimeConfig().public.supabaseConfigured
const user = useSupabaseUser()
const demo = useDemo()

// The bot check for the demo button. Without a site key (local development) there is no check.
const siteKey = String(useRuntimeConfig().public.turnstileSiteId ?? '')
const captchaToken = ref('')
const captcha = ref<{ reset: () => void } | null>(null)

async function startDemo() {
  if (siteKey && !captchaToken.value) {
    demo.error.value = 'Please finish the check, then try again.'
    return
  }
  const ok = await demo.start(captchaToken.value || undefined)
  if (!ok) {
    // A token works once, so ask for a new one.
    captchaToken.value = ''
    captcha.value?.reset()
  }
}

const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')
const notice = ref('')

// A demo visitor goes home, where Sprout is waiting. A real parent goes to the Parent page.
watch(
  user,
  (value) => {
    if (value) void navigateTo(demo.isDemo.value ? '/' : '/parent')
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
  const { error: failure } = await client.auth.signInWithPassword({ email: email.value.trim(), password: password.value })
  busy.value = false
  if (failure) {
    if (import.meta.dev) console.warn('Supabase auth error:', failure.message)
    error.value = authErrorMessage(failure)
  }
}

const field = 'min-h-12 w-full rounded-xl border-2 border-slate-600 bg-white px-4 text-base text-slate-900'
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <h1 class="text-[clamp(1.75rem,4vw+1rem,2.5rem)] font-bold text-emerald-900">Try MathSprout</h1>

    <p v-if="!configured" role="alert" class="rounded-2xl bg-amber-100 p-4 text-base font-semibold text-amber-950">
      Sign-in isn’t set up on this site yet. Practice and Tutor still work.
    </p>

    <!-- The demo: no account, a private sandbox with sample data -->
    <section aria-labelledby="demo-title" class="space-y-3 rounded-2xl bg-emerald-700 p-5 text-white">
      <h2 id="demo-title" class="text-2xl font-bold">Try the full demo</h2>
      <p class="text-base text-emerald-50">
        No account needed. You get a private sandbox with sample data and a child called Sprout. Try Today, Parent mode, stars and
        Deep Check. Everything is deleted after 24 hours.
      </p>
      <TurnstileBox
        v-if="siteKey"
        ref="captcha"
        :site-key="siteKey"
        @token="captchaToken = $event; demo.error.value = ''"
        @expired="captchaToken = ''"
      />
      <p v-if="demo.error.value" role="alert" class="rounded-xl bg-white p-3 text-base font-semibold text-red-800">{{ demo.error.value }}</p>
      <button
        type="button"
        :disabled="demo.starting.value || !configured"
        class="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-5 text-lg font-bold text-emerald-900 hover:bg-emerald-50 focus-visible:outline-4 disabled:opacity-60 sm:w-auto"
        @click="startDemo"
      >
        {{ demo.starting.value ? 'Getting your sandbox ready…' : 'Try the full demo' }}
      </button>
    </section>

    <!-- Family members sign in with the email and password they were invited with -->
    <section aria-labelledby="signin-title" class="space-y-4">
      <div>
        <h2 id="signin-title" class="text-2xl font-bold text-slate-900">Family sign in</h2>
        <p class="text-base text-slate-700">For the family this app was made for. Accounts are by invitation.</p>
      </div>
      <form class="space-y-4 rounded-2xl bg-white p-5" @submit.prevent="submit">
        <div class="space-y-1">
          <label for="email" class="text-base font-semibold text-slate-900">Email</label>
          <input id="email" v-model="email" type="email" autocomplete="email" required :class="field">
        </div>
        <div class="space-y-1">
          <label for="password" class="text-base font-semibold text-slate-900">Password</label>
          <input id="password" v-model="password" type="password" autocomplete="current-password" minlength="6" required :class="field">
        </div>
        <p v-if="error" role="alert" class="text-base font-semibold text-red-800">{{ error }}</p>
        <p v-if="notice" role="status" class="text-base font-semibold text-emerald-900">{{ notice }}</p>
        <button
          type="submit"
          :disabled="busy"
          class="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-emerald-700 px-5 text-lg font-bold text-white hover:bg-emerald-800 focus-visible:outline-4 disabled:opacity-60"
        >
          Sign in
        </button>
      </form>
      <button type="button" class="inline-flex min-h-11 items-center text-base font-semibold text-emerald-900 underline" @click="forgot">
        Forgot password?
      </button>
    </section>
  </div>
</template>
