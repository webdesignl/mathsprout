<script setup lang="ts">
useHead({ title: 'Signing in · MathSprout' })

const user = useSupabaseUser()

// The Supabase module finishes the sign-in from the email link; then she goes home.
watch(
  user,
  (value) => {
    if (value) void navigateTo('/')
  },
  { immediate: true },
)
</script>

<template>
  <div class="mx-auto max-w-md space-y-4">
    <h1 class="text-4xl font-bold text-emerald-900">Signing you in…</h1>
    <p role="status" class="text-xl text-slate-900">One moment. If nothing happens, go back to the sign in page.</p>
    <NuxtLink to="/login" class="inline-flex min-h-12 items-center text-lg font-semibold text-emerald-900 underline">
      Sign in page
    </NuxtLink>
  </div>
</template>
