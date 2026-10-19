<script setup lang="ts">
import { useChildStore } from '../stores/child'

const comingSoon = [{ label: 'Deep Check', hint: 'Deep Check, coming soon' }]

/** Ideas waiting for a parent's stars, shown as a small number on the Parent link. */
const user = useSupabaseUser()
const client = useSupabaseClient()
const parent = useParentMode()
async function signOut() {
  await parent.lock()
  useChildStore().select(null)
  await client.auth.signOut()
  await navigateTo('/login')
}

const childStore = useChildStore()
const familyName = useState<string>('family-name', () => '')


/** Ideas waiting for a star, shown on the Parent link. */
const pending = useState<number>('pending-ideas', () => 0)

async function loadWho() {
  if (!user.value) {
    familyName.value = ''
    return
  }
  const [kids, family, waiting] = await Promise.all([
    client.from('children').select('id, nickname, grade').order('created_at'),
    client.from('families').select('name').maybeSingle(),
    client.from('ideas').select('id', { count: 'exact', head: true }).is('approved', null),
  ])
  pending.value = waiting.count ?? 0
  if (!kids.error && kids.data) childStore.setChildren(kids.data)
  familyName.value = family.data?.name ?? ''
}
watch(user, loadWho, { immediate: true })
onMounted(() => parent.refresh())

</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b-2 border-emerald-200 bg-white">
      <div
        class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3"
      >
        <NuxtLink
          to="/"
          class="flex min-h-12 items-center gap-2 rounded-lg text-2xl font-bold text-emerald-800"
        >
          <svg
            class="size-9"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M16 29V14" stroke="#166534" stroke-width="3" stroke-linecap="round" />
            <path d="M16 15C16 8 11 5 4 5c0 7 4 10 12 10Z" fill="#22c55e" />
            <path d="M16 19c0-6 4-9 12-9 0 6-4 9-12 9Z" fill="#16a34a" />
          </svg>
          MathSprout
        </NuxtLink>

        <nav aria-label="Main">
          <ul class="flex flex-wrap items-center gap-2">
            <li>
              <NuxtLink
                to="/practice"
                class="inline-flex min-h-12 items-center rounded-lg px-4 font-semibold text-emerald-900 hover:bg-emerald-100"
                active-class="bg-emerald-100 underline underline-offset-4"
              >
                Practice
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/tutor"
                class="inline-flex min-h-12 items-center rounded-lg px-4 font-semibold text-emerald-900 hover:bg-emerald-100"
                active-class="bg-emerald-100 underline underline-offset-4"
              >
                Tutor
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                to="/parent"
                class="inline-flex min-h-12 items-center gap-2 rounded-lg px-4 font-semibold text-emerald-900 hover:bg-emerald-100"
                active-class="bg-emerald-100 underline underline-offset-4"
              >
                Parent
                <span
                  v-if="pending > 0"
                  class="rounded-full bg-amber-200 px-2 py-0.5 text-sm text-amber-950"
                  :aria-label="`${pending} to review`"
                >
                  {{ pending }}
                </span>
              </NuxtLink>
            </li>
            <li v-for="item in comingSoon" :key="item.label">
              <a
                href="#"
                aria-disabled="true"
                :aria-label="item.hint"
                class="inline-flex min-h-12 cursor-not-allowed items-center gap-2 rounded-lg px-4 font-semibold text-slate-600"
                @click.prevent
              >
                {{ item.label }}
                <span class="rounded-full bg-slate-200 px-2 py-0.5 text-sm text-slate-700">
                  coming soon
                </span>
              </a>
            </li>
          </ul>
        </nav>

        <div
          v-if="user"
          class="flex flex-wrap items-center gap-x-4 gap-y-2 sm:ml-auto"
          aria-label="Signed in"
          role="group"
        >
          <p class="text-lg font-semibold text-emerald-900">
            Welcome, {{ childStore.selected?.nickname ?? 'friend' }}<span v-if="familyName"> · {{ familyName }}</span>
          </p>
          <span v-if="parent.unlocked.value" class="rounded-full bg-amber-200 px-2 py-0.5 text-sm text-amber-950">Parent mode</span>
          <button
            type="button"
            class="inline-flex min-h-12 items-center rounded-xl bg-white px-4 font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100"
            @click="signOut"
          >
            Sign out
          </button>
        </div>
        <NuxtLink
          v-else
          to="/login"
          class="sm:ml-auto inline-flex min-h-12 items-center rounded-xl bg-white px-4 font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100"
        >
          Parent sign in
        </NuxtLink>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
      <slot />
    </main>
  </div>
</template>
