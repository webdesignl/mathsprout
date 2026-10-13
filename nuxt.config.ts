import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  // Top-level runtimeConfig keys stay on the server and are never sent to the browser.
  // NUXT_ANTHROPIC_API_KEY fills in anthropicApiKey.
  runtimeConfig: {
    anthropicApiKey: '',
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})
