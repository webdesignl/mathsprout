import { feedbackRow, type FeedbackInput } from '../utils/feedback'
import { isDemoUser } from '../utils/demo'

/** Saves feedback for the signed-in family. The app can only add feedback; the owner reads it in Supabase. */
export function useFeedback() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const sending = ref(false)
  const error = ref('')

  async function send(input: FeedbackInput): Promise<boolean> {
    if (sending.value) return false
    error.value = ''
    const checked = feedbackRow(input)
    if ('error' in checked) {
      error.value = checked.error
      return false
    }
    sending.value = true
    const { data: family } = await client.rpc('my_family_id')
    // The table is not in the generated types yet, so the row goes in untyped.
    const { error: failure } = await (client.from('feedback' as never) as unknown as {
      insert: (row: object) => Promise<{ error: { message: string } | null }>
    }).insert({ ...checked.row, family_id: family, is_demo: isDemoUser(user.value as { is_anonymous?: unknown } | null) })
    sending.value = false
    if (failure) {
      error.value = 'Your feedback could not be sent. You may have already sent a few today.'
      return false
    }
    return true
  }

  return { send, sending, error }
}
