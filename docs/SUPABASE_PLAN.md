# Supabase plan: parent login, PIN for stars, row level security

Goal for tomorrow: a parent signs in, her child's work and the stars are saved, and only the parent can give stars. Nothing a child can do on the device should be able to give herself a star or read another family's data.

## The security idea in one paragraph

Three layers, each doing one job.

1. **Supabase Auth** says who the family is (a parent account). The child has no account. The child uses the app on a device where the parent is signed in.
2. **Row level security (RLS)** says which rows that parent can touch: only their own family's. Default is no access.
3. **The PIN** says "a parent is at the keyboard right now". It is checked in the database (not only in the browser), so a child can't get past it by editing the page or calling the API.

The PIN is a lock on a signed-in session. It is not a login. A 4-digit PIN has only 10,000 combinations, so it must never be the only protection, and the database must limit wrong tries.

## Decisions (approved 2026-10-14)

| # | Question | Decision |
|---|---|---|
| 1 | How does the parent sign in? | Email magic link. Google sign-in later, if wanted. |
| 2 | PIN length | 4 digits, with the lockout below. |
| 3 | What do we save? | Attempts, ideas and star reviews, the scores from practice sets, and screen time (how long she used the app per day and per week). Not photos, not typed problem text, not voice. |
| 4 | Children's data rules | We store no personal details, only her practice scores, attempts, her own ideas, stars and screen time. The user will check the region's rules in Supabase later. Before real use, still confirm this: a nickname and a child's learning history are data about a child, even without a name. |
| 5 | Unlock length | 10 minutes, then the Parent corner locks again. Leaving the page locks it. |
| 6 | One child or several? | Design for several (a `children` table), show one for now. |
| 7 | Child's name | Nickname only. It is never sent to any AI (existing rule). |
| 8 | Signed out | Practice and Tutor stay usable signed out (data stays in the tab, as today). Saving and the Parent corner need login. |

## Data model

All tables have row level security on. `parent_id` is `auth.uid()`.

- `parents` : `id` (= auth user id), `pin_hash`, `failed_attempts`, `locked_until`.
- `parent_unlock` : `parent_id`, `unlocked_until`. One row per parent.
- `children` : `id`, `parent_id`, `nickname`, `grade`.
- `practice_sets` : `id`, `child_id`, `kind` (fractions, mixed), `started_at`, `finished_at`, `correct`, `total` (the score, worked out by code from the attempts).
- `attempts` : `id`, `set_id`, `tags` (text array), `slip`, `answer` (not the question), `status` (correct, wrong, skipped), `hints_used`, `proof_helped`, `created_at`.
- `tutor_runs` : `id`, `child_id`, `steps` (count), `hints_used`, `tags` (text array), `slips` (text array), `created_at`. A summary only.
- `ideas` : `id`, `child_id`, `set_id`, `text`, `approved` (null, true, false), `reviewed_at`.
- `usage_days` : `child_id`, `day`, `area` (practice, tutor), `active_seconds`. One row per child, day and area. Weekly totals are sums of these rows.
- Stars are not stored. They are `count(*) where approved = true`, so they can't drift.

## Screen time

- **What it measures:** time she actively used the app, not time the tab was open. A timer counts only while the tab is visible and she has touched, clicked or typed in the last 60 seconds. It pauses when she is idle or switches tab.
- **How it is saved:** the browser adds the seconds and sends them about once a minute, and when she leaves the page, through a database function `add_usage(child_id, area, seconds)`. The function adds to today's row, and caps one call at 120 seconds so a bad client can't invent hours.
- **Who sees it:** the parent, in the Parent corner: today, this week, a small bar per day. No PIN is needed to read it (it is her own family's data); changing or deleting it is not possible from the client.
- **What it is not:** not a lock or a limit. It does not stop her using the app. A daily limit could be added later.
- **Not stored:** what she looked at, only how long and which area.

## Row level security

- Helper: `owns_child(child_id)` returns true when the child belongs to `auth.uid()`. Used by every child-linked table so each policy is one line.
- `select` / `insert` / `update` / `delete` policies on every table are `using (owns_child(child_id))` (or `parent_id = auth.uid()` for `parents`, `children`, `parent_unlock`).
- `anon` role: no policy, so no access at all.
- **Stars:** the `ideas` table can be inserted by the child's session, but `approved` and `reviewed_at` can be changed only by the function `give_star(idea_id, approved)`, which checks `parent_unlock.unlocked_until > now()`. A normal update policy on `approved` does not exist.
- `pin_hash`, `failed_attempts` and `locked_until` are never readable from the client (a view without them, or column privileges).
- The service role key is used only in server routes and never reaches the browser.

## The PIN, step by step

1. First time: the parent sets a PIN. A database function `set_pin(pin)` stores `crypt(pin, gen_salt('bf'))`. Never the PIN itself.
2. Unlock: `unlock_parent_mode(pin)` compares the hash. Right: set `unlocked_until = now() + 10 minutes`, reset failures. Wrong: add 1 to `failed_attempts`.
3. Lockout: after 5 wrong tries, `locked_until = now() + 15 minutes`, doubling each time. Counted in the database, so clearing the browser doesn't reset it.
4. Forgot the PIN: sign in again by email link, then set a new one (the email account is the recovery).
5. The Parent page shows a PIN pad first. Giving or removing a star calls `give_star`, which fails if the unlock has expired.

## Nuxt side

- Add the `@nuxtjs/supabase` module. Environment: `SUPABASE_URL`, `SUPABASE_KEY` (the publishable key). The service key only in server-side env.
- Route middleware: `/parent` needs a signed-in user and a live unlock. Practice and Tutor do not need login.
- Tutor API routes: with a signed-in user, rate limit by `auth.uid()` instead of IP (better cost control than one shared in-memory limit). Signed-out keeps the IP limit.
- Stores: `practice` gets a thin save layer (`saveAttempt`, `saveIdea`) that does nothing when signed out. The Parent page reads ideas from the database instead of the tab.
- Migrations live in `supabase/migrations/` and run with the Supabase CLI, so the schema is in git.

## Order of work tomorrow

1. **Morning:** create the Supabase project, install the CLI, write migration 1 (tables).
2. **Then RLS and its tests first**, before any app code. Tests (pgTAP or a script) with two parents, A and B: A can't read, change or insert into B's rows; `add_usage` caps and adds correctly; `anon` sees nothing; a child session can't change `approved`; wrong PIN five times locks; expired unlock blocks `give_star`.
3. **Midday:** sign in with magic link, session in Nuxt, `/parent` middleware.
4. **Afternoon:** PIN functions, PIN pad on the Parent page, `give_star`.
5. **Late:** save attempts, scores and ideas from Practice, the screen time timer and weekly view on the Parent page, `docs/DECISIONS.md` entries, README setup notes.
6. **Before merging:** `npm run test:run`, `npm run typecheck`, and the RLS tests all pass.

## Phase 2, after the Supabase basics: struggle areas for parents (summary, not individual questions)

Decided: fixed templates only, no AI. Build this after sign-in, the PIN, row level security, saved attempts and screen time all work and their tests pass.

- **Idea:** the Parent corner shows "where she needs more practice", by type of question, not the questions themselves. Example: "Subtracting mixed numbers that need regrouping: 5 of 8 attempts needed hints", "Dividing by a fraction: flips the wrong fraction (3 times)", "Choosing the operation: mixed up adding and multiplying (2 times)".
- **Skill tags (made by code, no AI):** each problem gets tags from the engine: the operation; mixed numbers; unlike bottom numbers (needs a common denominator); needs regrouping; fraction of a whole number; divide by a fraction. In a multi-step problem each step has its own tags.
- **What is stored per attempt or step:** the tags, the result (right first time, needed hints, reached teach), the number of hints, and the slip the engine named (`diagnose`: not flipping, not simplified, parts multiplied separately, wrong operation, and so on). No question text, numbers, photos or story.
- **How "struggle" is decided:** a tag over the last 14 days with at least 4 attempts, where more than half needed hints or teach, or one slip repeats 3 or more times. Shown with plain counts. The engine's numbers decide this, not AI.
- **Wording:** fixed template sentences, chosen by code from the tag and the counts (for example "Subtracting mixed numbers that need regrouping: {n} of {m} attempts needed hints. Try a few of these together."). No AI is used, so there is no AI cost and no child data leaves the app. An AI-written weekly sentence can be added later if wanted; it would receive only tag names and counts.
- **Cost:** rows are tiny (a few per attempt), far inside the free tier. AI cost is zero.
- **Work:** about half a day: tag function and tests (1 hour), save tags and slips with each attempt (1 hour), a SQL view that counts per tag (1 hour), the Parent corner section (1.5 hours), template sentences (1 hour).

## Risks to watch

- A policy mistake exposes data silently. That is why the two-parent tests come before the app code.
- Giving the child's session the same login as the parent is what makes the PIN necessary. Don't skip the database-side PIN check.
- Never put the service key or the PIN in client code, logs or URLs.
- Don't save photos, typed problem text or voice. Keep to the existing rule that no personal detail goes to any AI.
- Keep a way to run the app with no Supabase (local development and tests) so the existing 676 tests still run.

## Out of scope tomorrow

Google sign-in, AI-written summaries, several children in the UI, daily time limits, progress charts beyond the weekly bars, drawings of rough work, moving the Tutor rate limit to shared storage, push or email reports.
