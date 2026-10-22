# Public demo: settings checklist

Do these once, in order. The code is already in the app; these are the switches that only you can flip.

## 1. Supabase: run the two migrations

In **SQL Editor → New query**, run each file from `supabase/migrations/`, in this order (both are safe to run twice):

1. `20261023100000_demo_sandbox.sql` (demo family, sample data, no photos for demo families)
2. `20261023110000_demo_cleanup.sql` (deletes old demos every hour)

Then paste `supabase/tests/rls_tests.sql` and run it. It should begin with `ALL PASSED`.

## 2. Supabase: sign-in settings (Authentication → Sign In / Providers)

- Turn **on** *Allow anonymous sign-ins*. This is what the demo button uses.
- Turn **off** *Allow new users to sign up*, so strangers cannot create real accounts.
- **Test both ways before sharing the link:**
  1. Press *Try the full demo* on the site: you should land on the home page with the yellow demo banner and a child called Sprout.
  2. Try to create a real account some other way (for example with the Supabase API from a script): it must be refused.
- **Open question until tested:** the sign-up switch might also block anonymous sign-ins on your project. If the demo button then says "The demo is not available right now", turn sign-ups back on, keep anonymous sign-ins on, and tell me: the sign-in page no longer has a Create account button, so a stranger has no way to create an account in the app, and we can find another way to block the API.

## 3. Cloudflare Turnstile (bot check for the demo button)

1. In a free Cloudflare account, open **Turnstile → Add widget**. Hostnames: your Vercel address (and `localhost` for testing). Mode: **Managed**.
2. Copy the **Site key** and the **Secret key**.
3. In Supabase: **Authentication → Attack Protection → Enable CAPTCHA protection**, choose **Turnstile**, paste the **Secret key**. The secret key goes **only** here, never in Vercel or in the code.
4. In Vercel (next section), add the **Site key** as `NUXT_PUBLIC_TURNSTILE_SITE_KEY`.

While CAPTCHA protection is on in Supabase and the site key is missing in Vercel, the demo button will fail with "Please finish the check". Add the key and redeploy.

## 4. Supabase: other settings

- **Authentication → URL Configuration:** *Site URL* is your Vercel address. Add `<your address>/confirm` to *Redirect URLs*.
- **Authentication → Rate Limits:** keep *anonymous sign-ins per hour per IP* at the default (30) or lower. It stops one person from making thousands of sandboxes.
- **Database → Extensions:** make sure **pg_cron** is on (the migration turns it on where it can).
- **Check the hourly cleanup exists:** in SQL Editor run `select jobname, schedule from cron.job;`. You should see `delete-old-demo-families` with `0 * * * *`.
- **Try the cleanup by hand:** run `select public.delete_old_demo_families();`. It returns how many families and users it removed. Demo sandboxes younger than 24 hours stay.

## 5. Vercel environment variables (Production and Preview)

| Name | Value | Why |
|---|---|---|
| `SUPABASE_URL` | `https://<project>.supabase.co` | The project address (nothing after `.co`) |
| `SUPABASE_KEY` | The **publishable** key | Never the secret key |
| `NUXT_PUBLIC_TURNSTILE_SITE_KEY` | The Turnstile **site** key | Bot check on the demo button |
| `NUXT_PUBLIC_PORTFOLIO_URL` | Your portfolio address (optional) | The "See my portfolio" link on the home page |
| `NUXT_PUBLIC_CONTACT_EMAIL` | An address you are happy to publish (optional) | The contact line on the Privacy page. Without it the page says contact details will be added. |
| `NUXT_ANTHROPIC_API_KEY` | Your API key | The real tutor, for the family account only |
| `DEMO_MODE` | `false` | `true` is the emergency switch: canned tutor answers for everyone |

Redeploy after changing them (they are read when the site is built).

Also keep:
- the **Vercel Firewall** rule on `/api/tutor/` (40 requests per 10 minutes per IP), and
- the **Anthropic monthly spend limit**.

## 6. Check before the LinkedIn post

- [ ] Signed out: Tutor shows "Demo: the tutor uses a sample problem." and answers with the sample problem.
- [ ] Demo visitor: Today, Parent (PIN 1234), stars, Deep Check all work; the banner shows on every page; *End demo* signs out.
- [ ] Demo visitor: Tutor still answers with the sample problem (no AI call).
- [ ] Your real family account: the tutor still reaches the AI.
- [ ] The Privacy link in the footer opens the Privacy page, and the contact line is right.
- [ ] A second browser (or a private window) gets its **own** demo sandbox, not the first one's data.
- [ ] Phone and desktop both look right.
- [ ] Record a 60 to 90 second walkthrough video (Today, tick a task, earn a star, unlock Parent with the PIN, plan tomorrow). Most recruiters watch a video before they click.
