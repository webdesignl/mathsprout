<script setup lang="ts">
const comingSoon = [
  { label: 'Deep Check', hint: 'Deep Check, coming soon' },
  { label: 'Parent', hint: 'Parent, coming soon' },
]
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
      </div>
    </header>

    <main class="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <slot />
    </main>
  </div>
</template>
