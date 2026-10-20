/**
 * The project URL is just the host, like https://abcd.supabase.co. People often paste the API address from the
 * dashboard (…/rest/v1) or the auth address (…/auth/v1), which makes every sign-in request go to a wrong path and
 * answer 404. This cuts those endings and any trailing slashes. An empty value stays empty.
 */
export function normalizeSupabaseUrl(value: string): string {
  let url = value.trim()
  for (;;) {
    const next = url.replace(/\/+$/, '').replace(/\/(rest|auth|storage|realtime|functions)\/v\d+$/i, '')
    if (next === url) return url
    url = next
  }
}
