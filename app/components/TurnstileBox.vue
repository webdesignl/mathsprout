<script setup lang="ts">
/**
 * The Cloudflare Turnstile bot check. It loads Cloudflare's script once, draws the widget, and hands back a one-time
 * token. Supabase verifies the token with the secret key kept in its own settings; this app never sees that key.
 */
interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string
  reset(id: string): void
  remove(id: string): void
}
declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const props = defineProps<{ siteKey: string }>()
const emit = defineEmits<{ token: [value: string]; expired: []; failed: [] }>()

const box = ref<HTMLDivElement | null>(null)
let widgetId: string | null = null

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    const script = existing ?? Object.assign(document.createElement('script'), { src: SCRIPT_SRC, async: true, defer: true })
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Turnstile did not load')), { once: true })
    if (!existing) document.head.appendChild(script)
  })
}

onMounted(async () => {
  try {
    await loadScript()
    if (!box.value || !window.turnstile) return
    widgetId = window.turnstile.render(box.value, {
      sitekey: props.siteKey,
      theme: 'light',
      // The wide widget is 300px; on the narrowest phones use the small one so nothing sticks out.
      size: window.innerWidth < 360 ? 'compact' : 'flexible',
      callback: (token: string) => emit('token', token),
      'expired-callback': () => emit('expired'),
      'error-callback': () => emit('failed'),
    })
  } catch {
    emit('failed')
  }
})

onBeforeUnmount(() => {
  if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
})

defineExpose({
  reset() {
    if (widgetId && window.turnstile) window.turnstile.reset(widgetId)
  },
})
</script>

<template>
  <div class="max-w-full overflow-hidden rounded-xl">
    <div ref="box" aria-label="Check that you are a person" />
  </div>
</template>
