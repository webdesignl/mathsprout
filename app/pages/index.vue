<script setup lang="ts">
import { useChildStore } from '../stores/child'
import { avatarOf } from '../utils/avatars'

useHead({ title: 'MathSprout' })

const user = useSupabaseUser()
const childStore = useChildStore()
const { fetchChildren } = useChildren()
const portfolioUrl = String(useRuntimeConfig().public.portfolioUrl ?? '')

onMounted(async () => {
  if (!user.value) return
  const list = await fetchChildren()
  if (list) childStore.setChildren(list)
})

const button =
  'inline-flex min-h-16 items-center justify-center rounded-2xl bg-emerald-700 px-10 text-2xl font-bold text-white shadow-md hover:bg-emerald-800'
</script>

<template>
  <section class="mx-auto flex max-w-xl flex-col items-center gap-5 py-10 text-center">
    <!-- A child is picked: one welcome, one line, one main button, one small gift. -->
    <template v-if="user && childStore.selected">
      <span class="flex size-16 items-center justify-center rounded-full bg-amber-100 text-4xl" aria-hidden="true">
        {{ avatarOf(childStore.selected.avatar) }}
      </span>
      <div class="space-y-1">
        <h1 class="text-4xl font-bold text-emerald-900 sm:text-5xl">Welcome, {{ childStore.selected.nickname }}</h1>
        <p class="text-xl text-slate-800">Let’s grow your math.</p>
      </div>
      <NuxtLink to="/practice" :class="button">Start practicing</NuxtLink>
      <StarCounter />
      <button
        v-if="childStore.children.length > 1"
        type="button"
        class="min-h-12 text-lg font-semibold text-emerald-900 underline underline-offset-4"
        @click="childStore.select(null)"
      >
        Not {{ childStore.selected.nickname }}? Switch
      </button>
    </template>

    <!-- Signed in, nobody picked yet. -->
    <template v-else-if="user && childStore.children.length">
      <h1 class="text-4xl font-bold text-emerald-900 sm:text-5xl">Who’s practicing?</h1>
      <ul class="flex flex-wrap justify-center gap-3">
        <li v-for="c in childStore.children" :key="c.id">
          <button
            type="button"
            class="min-h-16 rounded-2xl bg-white px-8 text-2xl font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100"
            @click="childStore.select(c.id)"
          >
            <span aria-hidden="true" class="mr-2 text-3xl">{{ avatarOf(c.avatar) }}</span>{{ c.nickname }}
          </button>
        </li>
      </ul>
    </template>

    <!-- Signed out, or signed in with no children yet. -->
    <template v-else>
      <h1 class="text-4xl font-bold text-emerald-900 sm:text-5xl">Let’s grow your math</h1>
      <p v-if="!user" class="text-lg text-slate-800">
        MathSprout is a math practice app for one 4th grader doing Singapore Math and Olympiad prep. Code checks every answer, and
        the tutor only asks hint questions.
      </p>
      <NuxtLink to="/practice" :class="button">Start practicing</NuxtLink>
      <div v-if="!user" class="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
        <NuxtLink to="/login" class="inline-flex min-h-11 items-center text-lg font-semibold text-emerald-900 underline underline-offset-4">
          Try the full demo
        </NuxtLink>
        <a
          v-if="portfolioUrl"
          :href="portfolioUrl"
          rel="noopener"
          class="inline-flex min-h-11 items-center text-lg font-semibold text-emerald-900 underline underline-offset-4"
        >
          See my portfolio
        </a>
      </div>
      <p v-if="user && childStore.loaded" class="text-lg text-slate-800">
        No children yet. <NuxtLink to="/parent" class="font-semibold text-emerald-900 underline">A parent can add one</NuxtLink>.
      </p>
    </template>
  </section>
</template>
