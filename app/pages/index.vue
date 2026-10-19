<script setup lang="ts">
import { useChildStore } from '../stores/child'

useHead({ title: 'MathSprout' })

const user = useSupabaseUser()
const client = useSupabaseClient()
const childStore = useChildStore()

onMounted(async () => {
  if (!user.value) return
  const { data, error } = await client.from('children').select('id, nickname, grade').order('created_at')
  if (!error && data) childStore.setChildren(data)
})
</script>

<template>
  <section class="mx-auto flex max-w-2xl flex-col items-center gap-6 py-8 text-center">
    <h1 class="text-4xl font-bold text-emerald-900 sm:text-5xl">Let’s grow your math!</h1>
    <p class="text-xl text-slate-800">
      Try a few fraction problems. Take your time, and we will help you one step at a time.
    </p>

    <div v-if="user" class="w-full space-y-3 rounded-2xl bg-white p-5" role="group" aria-labelledby="who">
      <h2 id="who" class="text-2xl font-bold text-slate-900">Who’s practicing?</h2>
      <ul v-if="childStore.children.length" class="flex flex-wrap justify-center gap-3">
        <li v-for="c in childStore.children" :key="c.id">
          <button
            type="button"
            :aria-pressed="childStore.selectedId === c.id"
            class="min-h-16 rounded-2xl px-8 text-2xl font-bold"
            :class="childStore.selectedId === c.id ? 'bg-emerald-700 text-white' : 'bg-white text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100'"
            @click="childStore.select(c.id)"
          >
            {{ c.nickname }}
          </button>
        </li>
      </ul>
      <p v-else-if="childStore.loaded" class="text-xl text-slate-900">
        No children yet. <NuxtLink to="/parent" class="font-semibold text-emerald-900 underline">A parent can add one</NuxtLink>.
      </p>
    </div>

    <NuxtLink
      to="/practice"
      class="inline-flex min-h-16 items-center justify-center rounded-2xl bg-emerald-700 px-10 text-2xl font-bold text-white shadow-md hover:bg-emerald-800"
    >
      Start practicing
    </NuxtLink>
  </section>
</template>
