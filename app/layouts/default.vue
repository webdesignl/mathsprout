<script setup lang="ts">
import { useChildStore } from '../stores/child'
import { avatarOf } from '../utils/avatars'
import { todayString } from '../utils/todayPlan'

/** Ideas waiting for a parent's stars, shown as a small number on the Parent link. */
const user = useSupabaseUser()
const client = useSupabaseClient()
const parent = useParentMode()
const { fetchChildren } = useChildren()
async function signOut() {
  await parent.lock()
  useChildStore().select(null)
  await client.auth.signOut()
  await navigateTo('/login')
}

const childStore = useChildStore()
const familyName = useState<string>('family-name', () => '')


/** Ideas waiting for a star, shown on the Parent link. */
const pendingIdeas = useState<number>('pending-ideas', () => 0)
/** Tasks she added that a parent has not looked at yet. */
const unseenTasks = useState<number>('unseen-tasks', () => 0)
/** Days she finished that a parent has not looked at yet. */
const unseenCompletions = useState<number>('unseen-completions', () => 0)
const backlogCount = useState<number>('backlog-count', () => 0)
const historyUnseen = useState<number>('history-unseen', () => 0)
const pending = computed(() => pendingIdeas.value + unseenTasks.value + unseenCompletions.value + backlogCount.value)

/** An important task not done for 4 days or more is in the Backlog. */
function staleDate() {
  const d = new Date()
  d.setDate(d.getDate() - 4)
  return todayString(d)
}

async function loadWho() {
  if (!user.value) {
    familyName.value = ''
    return
  }
  const [kids, family, waiting, newTasks, finished, stale, history] = await Promise.all([
    fetchChildren(),
    client.from('families').select('name').maybeSingle(),
    client.from('ideas').select('id', { count: 'exact', head: true }).is('approved', null),
    client.from('tasks').select('id', { count: 'exact', head: true }).eq('seen_by_parent', false).eq('done', false),
    client.from('daily_plans').select('id', { count: 'exact', head: true }).eq('completion_seen', false),
    client.from('tasks').select('id', { count: 'exact', head: true }).eq('category', 'important').eq('done', false).lte('for_date', staleDate()),
    client.from('day_summaries').select('id', { count: 'exact', head: true }).eq('finished_all', true).eq('seen', false),
  ])
  pendingIdeas.value = waiting.count ?? 0
  unseenTasks.value = newTasks.count ?? 0
  unseenCompletions.value = finished.count ?? 0
  backlogCount.value = stale.count ?? 0
  historyUnseen.value = history.count ?? 0
  if (kids) childStore.setChildren(kids)
  familyName.value = family.data?.name ?? ''
}
watch(user, loadWho, { immediate: true })
onMounted(() => parent.refresh())


// ---- Menu: a side drawer on phones and tablets, inline links on wide screens ----
const route = useRoute()
const menuOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

const links = [
  { to: '/today', label: 'Today' },
  { to: '/practice', label: 'Practice' },
  { to: '/deep-check', label: 'Deep Check' },
  { to: '/tutor', label: 'Tutor' },
  { to: '/parent', label: 'Parent' },
]

/** The Parent area has denser text and controls than the pages she uses. */
const area = computed(() => (route.path.startsWith('/parent') ? 'parent' : 'child'))
useHead({
  htmlAttrs: { 'data-area': area },
  bodyAttrs: { class: computed(() => (menuOpen.value ? 'overflow-hidden' : '')) },
})

async function openMenu() {
  menuOpen.value = true
  await nextTick()
  closeButton.value?.focus()
}
function closeMenu(returnFocus = true) {
  menuOpen.value = false
  if (returnFocus) void nextTick(() => menuButton.value?.focus())
}
watch(() => route.fullPath, () => closeMenu(false))

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && menuOpen.value) closeMenu()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))

const { sections } = useParentSections()
/** Parent is a group in the menu: it opens to show its sections and stays open. */
const parentOpen = ref(route.path.startsWith('/parent'))
watch(() => route.path, (path) => { if (path.startsWith('/parent')) parentOpen.value = true })
const activeSection = computed(() => (route.path.startsWith('/parent') ? (route.query.tab as string | undefined) ?? 'plan' : ''))

/** Shown in the footer's copyright line. */
const year = new Date().getFullYear()

const linkClass = 'inline-flex min-h-12 items-center rounded-lg px-4 font-semibold text-emerald-900 hover:bg-emerald-100'
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a
      href="#main"
      class="sr-only z-50 rounded-lg bg-white px-4 py-2 font-semibold text-emerald-900 focus:not-sr-only focus:absolute focus:left-2 focus:top-2"
    >
      Skip to content
    </a>

    <DemoBanner />

    <header class="sticky top-0 z-30 border-b-2 border-emerald-200 bg-white">
      <div class="flex w-full items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:py-3">
        <!-- Phones and tablets: menu button on the left, logo in the middle. Wide screens: logo on the left. -->
        <div class="grid flex-1 grid-cols-[3rem_1fr_3rem] items-center lg:flex lg:flex-none lg:gap-1">
        <!-- A menu button on the left opens a side drawer -->
        <button
          ref="menuButton"
          type="button"
          class="relative -ml-2 inline-flex size-12 shrink-0 items-center justify-center rounded-lg text-emerald-900 hover:bg-emerald-100 lg:hidden"
          aria-label="Open menu"
          aria-controls="site-menu"
          :aria-expanded="menuOpen"
          @click="openMenu"
        >
          <svg class="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" focusable="false">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <span v-if="pending > 0" class="absolute right-1.5 top-1.5 size-3 rounded-full bg-amber-500 ring-2 ring-white" aria-hidden="true" />
        </button>
        <NuxtLink to="/" class="flex min-h-12 items-center justify-center gap-2 justify-self-center rounded-lg text-xl font-bold text-emerald-800 sm:text-2xl">
          <svg class="size-8 sm:size-9" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
            <path d="M16 29V14" stroke="#166534" stroke-width="3" stroke-linecap="round" />
            <path d="M16 15C16 8 11 5 4 5c0 7 4 10 12 10Z" fill="#22c55e" />
            <path d="M16 19c0-6 4-9 12-9 0 6-4 9-12 9Z" fill="#16a34a" />
          </svg>
          MathSprout
        </NuxtLink>
        <span class="lg:hidden" aria-hidden="true" />
        </div>

        <!-- Wide screens: everything in one row -->
        <div class="hidden items-center gap-x-2 lg:flex">
          <nav aria-label="Main">
            <ul class="flex items-center gap-1">
              <li v-for="item in links" :key="item.to">
                <NuxtLink :to="item.to" :class="[linkClass, 'relative gap-2 lg:min-h-14']" active-class="bg-emerald-100 underline underline-offset-4">
                  {{ item.label }}
                  <!-- Sits under the word, so "Parent" stays in line with the other links -->
                  <span
                    v-if="item.to === '/parent' && parent.unlocked.value"
                    class="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 px-2 text-xs font-bold leading-4 text-amber-950 no-underline"
                    aria-label="Parent mode is on"
                  >ON</span>
                  <span
                    v-if="item.to === '/parent' && pending > 0"
                    class="rounded-full bg-amber-200 px-2 py-0.5 text-sm text-amber-950"
                    :aria-label="`${pending} to review`"
                  >{{ pending }}</span>
                </NuxtLink>
              </li>
            </ul>
          </nav>
          <div v-if="user" class="flex items-center gap-x-2" role="group" aria-label="Signed in">
            <span class="inline-flex min-h-12 items-center px-2 font-semibold text-emerald-900">
              <span aria-hidden="true" class="mr-2 text-2xl">{{ avatarOf(childStore.selected?.avatar) }}</span>{{ childStore.selected?.nickname ?? 'No child picked' }}<template v-if="familyName">&nbsp;·&nbsp;{{ familyName }}</template>
            </span>
            <button type="button" :class="[linkClass, 'underline underline-offset-4']" @click="signOut">Sign out</button>
          </div>
          <NuxtLink v-else to="/login" :class="[linkClass, 'underline underline-offset-4']">Parent sign in</NuxtLink>
        </div>

      </div>
      <!-- Phones and tablets: who is signed in, and Sign in / Sign out, always in view -->
      <div class="flex items-center justify-between gap-3 border-t border-emerald-100 bg-emerald-50 px-4 sm:px-6 lg:hidden">
        <template v-if="user">
          <p class="flex min-w-0 items-center gap-2 py-1 text-base font-semibold text-emerald-900">
            <span aria-hidden="true" class="text-xl">{{ avatarOf(childStore.selected?.avatar) }}</span>
            <span class="truncate">{{ childStore.selected?.nickname ?? 'No child picked' }}<template v-if="familyName"> · {{ familyName }}</template></span>
          </p>
          <button type="button" class="inline-flex min-h-11 shrink-0 items-center px-2 text-base font-semibold text-emerald-900 underline underline-offset-4" @click="signOut">Sign out</button>
        </template>
        <template v-else>
          <p class="py-1 text-base text-slate-700">Not signed in</p>
          <NuxtLink to="/login" class="inline-flex min-h-11 shrink-0 items-center px-2 text-base font-semibold text-emerald-900 underline underline-offset-4">Parent sign in</NuxtLink>
        </template>
      </div>
    </header>

    <div v-if="menuOpen" class="fixed inset-0 z-40 lg:hidden">
      <button type="button" class="absolute inset-0 bg-slate-900/50" aria-label="Close menu" tabindex="-1" @click="closeMenu()" />
      <aside
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        class="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col gap-4 overflow-y-auto bg-white p-4 shadow-xl"
      >
        <div class="flex items-center justify-between">
          <span class="text-lg font-bold text-emerald-900">Menu</span>
          <button
            ref="closeButton"
            type="button"
            class="inline-flex size-12 items-center justify-center rounded-lg text-slate-900 hover:bg-slate-100"
            aria-label="Close menu"
            @click="closeMenu()"
          >
            <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" focusable="false">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav aria-label="Main">
          <ul class="space-y-1">
            <li v-for="item in links" :key="item.to">
              <!-- Parent is a group: tapping it opens its sections and they stay open -->
              <template v-if="item.to === '/parent'">
                <button
                  type="button"
                  class="flex min-h-12 w-full items-center justify-between rounded-lg px-4 text-left text-lg font-semibold text-emerald-900 hover:bg-emerald-100"
                  :class="route.path.startsWith('/parent') ? 'bg-emerald-100' : ''"
                  :aria-expanded="parentOpen"
                  aria-controls="menu-parent"
                  @click="parentOpen = !parentOpen"
                >
                  <span class="flex items-center gap-2">
                    <span class="flex flex-col items-start leading-tight">
                      {{ item.label }}
                      <span
                        v-if="parent.unlocked.value"
                        class="mt-0.5 rounded-full bg-amber-300 px-2 text-xs font-bold leading-4 text-amber-950"
                        aria-label="Parent mode is on"
                      >ON</span>
                    </span>
                    <span v-if="pending > 0" class="rounded-full bg-amber-200 px-2 py-0.5 text-sm text-amber-950" :aria-label="`${pending} to review`">{{ pending }}</span>
                  </span>
                  <svg class="size-5 transition-transform" :class="parentOpen ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                <ul v-show="parentOpen" id="menu-parent" class="mt-1 space-y-1 border-l-2 border-emerald-200 pl-3 ml-4">
                  <li v-for="sec in sections" :key="sec.id">
                    <NuxtLink
                      :to="{ path: '/parent', query: { tab: sec.id } }"
                      class="flex min-h-12 items-center justify-between rounded-lg px-3 text-base font-semibold text-slate-900 hover:bg-emerald-100"
                      :class="activeSection === sec.id ? 'bg-emerald-700 text-white hover:bg-emerald-700' : ''"
                      :aria-current="activeSection === sec.id ? 'page' : undefined"
                      @click="closeMenu(false)"
                    >
                      {{ sec.label }}
                      <span v-if="sec.badge > 0" class="rounded-full bg-amber-200 px-2 py-0.5 text-sm text-amber-950" :aria-label="`${sec.badge} new`">{{ sec.badge }}</span>
                    </NuxtLink>
                  </li>
                </ul>
              </template>
              <NuxtLink
                v-else
                :to="item.to"
                class="flex min-h-12 items-center rounded-lg px-4 text-lg font-semibold text-emerald-900 hover:bg-emerald-100"
                active-class="bg-emerald-100"
                @click="closeMenu(false)"
              >
                {{ item.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
        <div class="mt-auto border-t-2 border-slate-200 pt-3">
          <button
            v-if="user"
            type="button"
            class="flex min-h-12 w-full items-center rounded-lg px-4 text-lg font-semibold text-emerald-900 underline underline-offset-4 hover:bg-emerald-100"
            @click="signOut"
          >
            Sign out
          </button>
          <NuxtLink
            v-else
            to="/login"
            class="flex min-h-12 items-center rounded-lg px-4 text-lg font-semibold text-emerald-900 underline underline-offset-4 hover:bg-emerald-100"
            @click="closeMenu(false)"
          >
            Parent sign in
          </NuxtLink>
        </div>
      </aside>
    </div>

    <main id="main" class="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-8" tabindex="-1">
      <slot />
    </main>

    <footer class="border-t border-emerald-200 bg-white px-4 py-3 text-center text-base text-slate-700 sm:px-6">
      <p>© {{ year }} Priyadharshini Sadhasivam. All rights reserved.</p>
      <NuxtLink to="/privacy" class="inline-flex min-h-11 items-center font-semibold text-emerald-900 underline underline-offset-4">Privacy</NuxtLink>
    </footer>
  </div>
</template>
