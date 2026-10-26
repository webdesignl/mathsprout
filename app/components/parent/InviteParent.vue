<script setup lang="ts">
import { expiresLabel, INVITE_DAYS } from '../../utils/invite'

/** "Invite a parent": makes a one-time link for a second parent. Shown once, then only the open invites are listed. */
const { isDemo } = useDemo()
const { invites, busy, error, load, create, revoke } = useInvites()

const link = ref('')
const copied = ref(false)

onMounted(load)

async function makeInvite() {
  copied.value = false
  link.value = (await create()) ?? ''
}

async function copy() {
  try {
    await navigator.clipboard.writeText(link.value)
    copied.value = true
  } catch {
    // Clipboard can be blocked; the link is selectable in the box, so she can copy it by hand.
    copied.value = false
  }
}

const button = 'inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-lg font-bold'
const ghost = `${button} bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100`
</script>

<template>
  <section v-if="!isDemo" aria-labelledby="invite-title" class="space-y-3 rounded-2xl bg-white p-5">
    <h2 id="invite-title" class="text-2xl font-bold">Invite a parent</h2>
    <p class="text-lg text-slate-700">
      Make a one-time link for another parent. When they sign up from it, they join your family instead of starting a new one.
      The link works once and expires in {{ INVITE_DAYS }} days.
    </p>
    <button type="button" :disabled="busy" :class="[button, 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60']" @click="makeInvite">
      {{ busy ? 'Making the link…' : 'Invite a parent' }}
    </button>

    <p v-if="error" role="alert" class="text-lg font-semibold text-red-800">{{ error }}</p>

    <div v-if="link" class="space-y-2 rounded-xl border-2 border-emerald-700 bg-emerald-50 p-4">
      <label for="invite-link" class="text-lg font-semibold text-slate-900">Send this link (it is shown only now)</label>
      <input id="invite-link" :value="link" readonly class="min-h-12 w-full rounded-xl border-2 border-slate-600 bg-white px-3 text-base text-slate-900" @focus="($event.target as HTMLInputElement).select()">
      <div class="flex flex-wrap items-center gap-3">
        <button type="button" :class="ghost" @click="copy">{{ copied ? 'Copied' : 'Copy link' }}</button>
        <p v-if="copied" role="status" class="text-base font-semibold text-emerald-900">Link copied.</p>
      </div>
      <p class="text-base text-slate-700">
        Tell them the parent PIN in person. They will need it to turn on parent mode. Do not send the PIN with the link.
      </p>
    </div>

    <div v-if="invites.length" class="space-y-2">
      <h3 class="text-xl font-bold">Open invites</h3>
      <ul class="space-y-2">
        <li v-for="i in invites" :key="i.id" class="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-slate-300 p-3">
          <p class="text-lg text-slate-900">{{ expiresLabel(i.expires_at) }}</p>
          <button type="button" :class="ghost" :aria-label="`Remove the invite. ${expiresLabel(i.expires_at)}`" @click="revoke(i.id)">Remove</button>
        </li>
      </ul>
    </div>
  </section>
</template>
