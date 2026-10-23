import tailwindcss from '@tailwindcss/vite'
import { normalizeSupabaseUrl } from './app/utils/supabaseUrl'

// Supabase needs a URL and the publishable key at build time. Without them the whole site used to answer 500
// (the Supabase module cannot start). So the app falls back to a harmless local address: Practice and Tutor
// keep working, and the login page says plainly that sign-in is not set up. Never put a secret key here.
const supabaseUrl = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL || '')
const supabaseKey = process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_KEY || ''
const supabaseConfigured = Boolean(supabaseUrl && supabaseKey)

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
    public: {
      // True when the site was built with a Supabase URL and publishable key.
      supabaseConfigured,
      // The Cloudflare Turnstile SITE key (public by design). NUXT_PUBLIC_TURNSTILE_SITE_ID fills it in. The secret key
      // lives only in Supabase (Authentication > Attack Protection), never in this app.
      turnstileSiteId: '',
      // Optional links shown on the home page and the Privacy page: NUXT_PUBLIC_PORTFOLIO_URL, NUXT_PUBLIC_CONTACT_EMAIL.
      portfolioUrl: '',
      contactEmail: '',
    },
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
    url: supabaseUrl || 'http://127.0.0.1:54321',
    key: supabaseKey || 'supabase-not-configured',
    // Practice and Tutor work without signing in (nothing is saved). Only the Parent page needs an account.
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: ['/parent(/*)?'],
      exclude: [],
    },
  },
})
