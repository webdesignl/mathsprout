<script setup lang="ts">
if (!import.meta.dev) throw createError({ statusCode: 404, statusMessage: 'Not Found', fatal: true })

useHead({ title: 'Security check · MathSprout (dev)' })

const client = useSupabaseClient()
const user = useSupabaseUser()

type Outcome = 'idle' | 'blocked' | 'open'
const results = ref<Record<string, Outcome>>({})

/** "Blocked" means the database refused, or the row count was zero. Anything that really worked is OPEN. */
const checks: { id: string; label: string; run: () => Promise<boolean> }[] = [
  {
    id: 'child',
    label: 'Insert a child while locked',
    run: async () => {
      const { data: family } = await client.rpc('my_family_id')
      const { data, error } = await client.from('children').insert({ family_id: family as string, nickname: 'security-check' }).select()
      return !error && (data?.length ?? 0) > 0
    },
  },
  {
    id: 'secrets',
    label: 'Select from family_secrets',
    run: async () => {
      const { data, error } = await client.from('family_secrets' as 'children').select('*')
      return !error && (data?.length ?? 0) > 0
    },
  },
  {
    id: 'unlocks',
    label: 'Insert into parent_unlocks',
    run: async () => {
      const { error } = await client.from('parent_unlocks' as 'children').insert({
        session_id: crypto.randomUUID(),
        family_id: crypto.randomUUID(),
        user_id: user.value?.id,
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      } as never)
      return !error
    },
  },
  {
    id: 'task',
    label: 'Update a task while locked',
    run: async () => {
      const { data, error } = await client.from('tasks').update({ title: 'changed by security check' }).neq('id', crypto.randomUUID()).select()
      return !error && (data?.length ?? 0) > 0
    },
  },
]

async function run(check: (typeof checks)[number]) {
  results.value[check.id] = (await check.run()) ? 'open' : 'blocked'
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-4">
    <h1 class="text-3xl font-bold text-emerald-900">Security check (dev only)</h1>
    <p class="text-lg text-slate-900">
      Sign in, make sure parent mode is <strong>locked</strong>, then press each button. Every line must say Blocked.
    </p>
    <p v-if="!user" class="text-lg font-semibold text-red-800">Not signed in. <NuxtLink to="/login" class="inline-flex min-h-11 items-center underline">Sign in</NuxtLink> first.</p>
    <ul class="space-y-3">
      <li v-for="c in checks" :key="c.id" class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4">
        <button
          type="button"
          class="min-h-12 rounded-xl bg-white px-4 text-lg font-bold text-slate-900 ring-2 ring-slate-600 hover:bg-slate-100"
          @click="run(c)"
        >
          {{ c.label }}
        </button>
        <span
          role="status"
          class="text-xl font-bold"
          :class="results[c.id] === 'open' ? 'text-red-700' : 'text-green-800'"
        >
          <template v-if="results[c.id] === 'blocked'">Blocked</template>
          <template v-else-if="results[c.id] === 'open'">OPEN</template>
        </span>
      </li>
    </ul>
  </div>
</template>
