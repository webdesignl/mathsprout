<script setup lang="ts">
useHead({ title: 'MathSprout' })
</script>

<template>
  <section class="mx-auto flex max-w-2xl flex-col items-center gap-6 py-8 text-center">
    <h1 class="text-4xl font-bold text-emerald-900 sm:text-5xl">Let’s grow your math!</h1>
    <p class="text-xl text-slate-800">
      Try a few fraction problems. Take your time, and we will help you one step at a time.
    </p>
    <NuxtLink
      to="/practice"
      class="inline-flex min-h-16 items-center justify-center rounded-2xl bg-emerald-700 px-10 text-2xl font-bold text-white shadow-md hover:bg-emerald-800"
    >
      Start practicing
    </NuxtLink>
  </section>
</template>
