import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@pinia/nuxt', '@nuxtjs/supabase'],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  // Top-level runtimeConfig keys stay on the server and are never sent to the browser.
  // NUXT_ANTHROPIC_API_KEY fills in anthropicApiKey.
  runtimeConfig: {
    anthropicApiKey: '',
  },
  hooks: {
    // The engine playground is a developer tool. Drop every /dev route from production builds,
    // so they answer 404 like any page that does not exist.
    'pages:extend'(pages) {
      if (process.env.NODE_ENV !== 'production') return
      for (let i = pages.length - 1; i >= 0; i--) {
        if (pages[i]!.path.startsWith('/dev')) pages.splice(i, 1)
      }
    },
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  supabase: {
    // Practice and Tutor work without signing in (nothing is saved). Only the Parent page needs an account.
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: ['/parent(/*)?'],
      exclude: [],
    },
  },
})
