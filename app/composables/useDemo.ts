import { isDemoUser } from '../utils/demo'
import { authErrorMessage } from '../utils/friendlyErrors'
import { useChildStore } from '../stores/child'

/** Starting and ending the public demo (an anonymous Supabase user with a sandbox family). */
export function useDemo() {
  const user = useSupabaseUser()
  const client = useSupabaseClient()
  const parent = useParentMode()

  const isDemo = computed(() => isDemoUser(user.value))
  const starting = ref(false)
  const error = ref('')

  /** Signs in as a new anonymous visitor. The sign-up trigger builds the sandbox family. A Turnstile token may be passed. */
  async function start(captchaToken?: string): Promise<boolean> {
    if (starting.value) return false
    starting.value = true
    error.value = ''
    const { error: failure } = await client.auth.signInAnonymously(captchaToken ? { options: { captchaToken } } : undefined)
    starting.value = false
    if (failure) {
      if (import.meta.dev) console.warn('Supabase auth error:', failure.message)
      error.value = authErrorMessage(failure)
      return false
    }
    await navigateTo('/')
    return true
  }

  /** Ends the demo: parent mode locks, the child choice is forgotten, and the visitor is signed out. */
  async function end() {
    await parent.lock()
    useChildStore().select(null)
    await client.auth.signOut()
    await navigateTo('/login')
  }

  return { isDemo, starting, error, start, end }
}
