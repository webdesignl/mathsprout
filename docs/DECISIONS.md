# Decision log

A running record of product and engineering decisions, so future work knows what was chosen and why.
Newest decisions go at the bottom of each section. Update an entry's **Status** if a later decision
replaces it (keep the old entry; don't delete history).

How to add one: copy the template, give it the next number (`D-NN`), and link the PR or issue.

```
### D-NN: Short title
- **Date:** YYYY-MM-DD
- **Source:** who decided (user / Claude suggestion the user accepted) and where (PR #, issue #)
- **Decision:** what we do
- **Why:** the reason, in one or two sentences
- **Alternatives:** what we did not pick
- **Status:** Active | Replaced by D-NN | Open question
```

---

## Working agreements

### D-01: Code decides if math is right; AI never grades
- **Date:** 2026-10 (project start, see `CLAUDE.md`)
- **Source:** User, project rules
- **Decision:** All grading, hints, steps and proofs come from `app/utils/fraction.ts` and code that calls it. AI may only ask hint questions and explain.
- **Why:** Correctness must be exact and predictable for a child.
- **Alternatives:** AI grading of answers.
- **Status:** Active

### D-00: This is a practice test, not a competitive one: keep her motivated
- **Date:** 2026-10
- **Source:** User, when accepting the trade-offs in D-24 and D-25
- **Decision:** When a choice trades strictness for motivation, favor motivation. The app should make her want to do more practice, and not feel frustrated, annoyed or like quitting. Small ways she can guess a result, or lighter rules than a real exam would have, are acceptable.
- **Why:** The goal is a child who keeps practicing. Exam-style rigor is not the goal here.
- **Alternatives:** Exam-style strictness (hiding results, blocking guessing).
- **Status:** Active. Use this to settle future tie-breaks. It does not apply to math correctness (D-01), which stays strict.

### D-02: Branch and PR naming
- **Date:** 2026-10
- **Source:** User
- **Decision:** Feature branches are `feature-NNNN/short-name` (ticket numbers from 0001). Bug fixes are `bugfix-NNNN/short-name`. A branch that covers two tickets uses both numbers (for example `bugfix-0005-0007/...`). PRs go to `main`, which is protected and only changes by PR.
- **Why:** Easy to trace work to tickets.
- **Alternatives:** `feat/...` naming from an early draft.
- **Status:** Active

### D-03: Child's name and personal details never go to an AI API; nothing is saved yet
- **Date:** 2026-10
- **Source:** User, project rules
- **Decision:** No personal data is sent to any AI. For now no data is stored anywhere (store state lives in the open browser tab). Persistence is planned with Supabase.
- **Why:** Privacy, and the backend is not built yet.
- **Alternatives:** Local storage as a stopgap (offered, not chosen yet).
- **Status:** Active. Open question: add local storage before Supabase? (offered for parent reviews)

### D-04: Original problems only
- **Date:** 2026-10
- **Source:** User, project rules
- **Decision:** Never copy textbook or Olympiad problems. Story problems and real-world examples are written from scratch.
- **Why:** Copyright.
- **Status:** Active

---

## Fraction engine (PRs #2, #3)

### D-05: Integers only, one place for fraction math
- **Date:** 2026-10
- **Source:** User
- **Decision:** No floating point. Everything lives in `fraction.ts` and is tested in `tests/`. The UI and store never reimplement fraction math.
- **Why:** Exact answers; one tested source of truth.
- **Status:** Active

### D-06: Answer grading returns `correct`, `correctNotSimplest` or `wrong`
- **Date:** 2026-10
- **Source:** User
- **Decision:** "Simplest" is checked on the raw typed input (fraction part proper and reduced). An equal but not simplest answer is a nudge, not a wrong answer, and does not score.
- **Why:** Teaches simplest form without punishing right math.
- **Status:** Active

### D-07: Negative results are allowed in the engine but flagged
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** `add`/`subtract` can return negatives (`isNegative`); the generator never produces them for a 4th grader.
- **Status:** Active

### D-08: Hints are one short question and never give the answer
- **Date:** 2026-10
- **Source:** User (tone feedback from testing with a 9-year-old)
- **Decision:** Engine hints and app messages are one short sentence (about 12 words or fewer). Success lines are varied. The same hint never shows twice in a row. A test enforces the length.
- **Why:** She found the app "annoying" when it repeated itself or lectured.
- **Status:** Active

---

## Practice flow (PRs #4, #6)

### D-09: 10-problem set, first pass is always recorded separately from retries
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** A set is 10 problems. `firstTryCorrect` and `retryCorrect` are stored separately. The summary shows both ("8 of 10 first try, 10 of 10 after retry").
- **Why:** A retry must never rewrite what happened the first time.
- **Status:** Active

### D-10: A retry counts as solved once she solves it, even with help
- **Date:** 2026-10
- **Source:** Claude suggestion, accepted
- **Decision:** `retryCorrect` is set when she solves the problem in a retry, with or without hints.
- **Alternatives:** Count only retries solved with no wrong answer.
- **Status:** Active (flagged for review in PR #6)

### D-11: Score counts every solved problem
- **Date:** 2026-10
- **Source:** Claude suggestion, accepted
- **Decision:** Score is the number of solved problems, including ones solved after hints or steps. Those get status `correctWithHelp` and show in the summary.
- **Alternatives:** Score only first-try answers.
- **Status:** Active

### D-12: Worked steps never reveal the final "answer" step
- **Date:** 2026-10
- **Source:** Claude suggestion, accepted
- **Decision:** Steps offered after two wrong answers leave out the last answer step so she finishes it herself. (The Learn panel shows everything because she asked to understand.)
- **Status:** Active

### D-13: Learn panel highlights where her answer went off
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** `diagnose` picks the step; the note is built from that step's own numbers. Slips get kind names ("a borrowing slip"). It ends with "Try one like it": a new problem with the same operation and the same regroup need, not scored.
- **Why:** Teaches the method, not just the answer.
- **Status:** Active

### D-14: Story problems are a toggle and wrap the same numbers
- **Date:** 2026-10
- **Source:** User approved Claude's assumption
- **Decision:** A "Story problems" checkbox (on by default) wraps each problem in a short original story. Grading, hints, steps and proofs are unchanged.
- **Status:** Active (updated by D-17)

### D-15: End-of-set reward screen, extra credit graded by a parent
- **Date:** 2026-10
- **Source:** User (extra credit idea), then user (parent grading, replacing code grading)
- **Decision:** After the last problem she shares up to 3 real-world ideas and unlocks 3 knowledge cards (her ideas plus the app's own to fill gaps). Extra credit is not decided by code or AI. A parent gives one star or none per idea on the Parent page.
- **Why:** Code can't judge whether an idea makes sense, and AI must not grade.
- **Alternatives:** Code rule (3+ words, no repeats), which was built first and replaced.
- **Status:** Active. Known gaps: reviews live only in the open tab; the Parent page has no PIN.

### D-16: Proof rules (latest wins)
- **Date:** 2026-10, changed 2026-10
- **Source:** User (issue #5)
- **Decision:** On correct answers, ask "How can you prove it?" only on the first 2 problems of each type (add, subtract), per browser session, and require it (no skip). After that, no proof. After a wrong answer plus 3 hints, she adds her own wrong answer back to see it does not return to the starting number. Proof Master badge is 3 proofs in a row.
- **Why:** Proof is a teaching tool, not something to repeat on every problem.
- **Alternatives:** Earlier rule "required once per type, then skippable" (D-16a, replaced); Proof Master at 5.
- **Status:** Active. Replaces D-16a. When the proof happens relative to the "Correct!" message: see D-24.

### D-16a: Proof required once per operation, then skippable (replaced)
- **Date:** 2026-10
- **Source:** User
- **Status:** Replaced by D-16

---

## Bugfixes (PR #8, issues #5 and #7)

### D-17: Story problems show only the story
- **Date:** 2026-10
- **Source:** User (issue #7)
- **Decision:** No operation card under a story. She works out the operation herself. If she uses the opposite operation, `diagnose` returns `wrongOperation` with the hint "Are we putting together or taking away?".
- **Status:** Active. Replaces the "story plus card" part of D-14.

### D-18: "Third hint" counts every hint shown on a problem
- **Date:** 2026-10
- **Source:** Claude interpretation of issue #5, confirmed by user
- **Decision:** The first hint after each wrong answer plus any extra hints she asks for. Wrong, "Another hint", wrong again triggers the add-back; so do three wrong answers in a row.
- **Status:** Active

---

## Test navigation and rough work (this branch)

### D-19: Free navigation during a test (Skip, Back, Submit)
- **Date:** 2026-10
- **Source:** User request; behaviours chosen by user
- **Decision:** In the first pass she can Skip an unsolved problem, go Back to an earlier one, and press Submit at the last problem. Each problem keeps its own state (answer draft, hints, feedback) while she moves around. Retries and "Try one like it" keep their own simple Back button. Back (left) and Skip / Submit (right) sit in one row directly under "Check my answer" with tight spacing (user request; a centered-together version was tried and rejected as clumsy); "Next problem" is right-aligned below the feedback and proof.
- **Why:** Flexibility in taking a test.
- **Status:** Active

### D-20: Submitting with unanswered problems warns, then counts them as missed
- **Date:** 2026-10
- **Source:** User (chose the recommended option)
- **Decision:** Submit shows "You have N unanswered. Submit anyway?" with a way to keep working. If she submits, unanswered problems show ✗ in the summary and can be retried like any missed problem.
- **Alternatives:** Block submit until all are answered; submit with no warning.
- **Status:** Active

### D-21: Revisited correct problems are read-only
- **Date:** 2026-10
- **Source:** User (chose the recommended option)
- **Decision:** Going Back to a problem she already solved shows the problem, her answer and the feedback, and she cannot change it. Unanswered or still-wrong problems stay open.
- **Why:** Her score can't be changed by re-answering.
- **Alternatives:** Fully editable.
- **Status:** Active

### D-22: A solved problem with a pending proof can't be left going forward
- **Date:** 2026-10
- **Source:** Claude decision (consistent with D-16)
- **Decision:** If a proof is asked and not finished, Skip, Next and Submit are hidden for that problem. Back is still allowed.
- **Status:** Active

### D-23: Rough work side panel with pencil, pen, eraser, undo and clear
- **Date:** 2026-10
- **Source:** User asked for pencil and pen; Claude added eraser, undo and clear as basic needs
- **Decision:** A drawing panel for rough work. Drawings are kept per problem while the tab is open and are not saved or sent anywhere. Side by side on wide screens, a bottom sheet on narrow ones. Undo and Clear sit on their own labelled row and are always visible (user asked for a clear button). Undo right after Clear brings the page back, until she draws something new. Later change at the user's request: the drawing area is wider (square 1000 x 1000 page, 34rem panel on wide screens, so the layout's main area allows up to 7xl) and the pencil, pen and eraser are icon buttons (with names for screen readers and tooltips) instead of text.
- **Status:** Active

---

## Flow changes

### D-24: On proof problems, the proof comes before the verdict (correct answers only)
- **Date:** 2026-10
- **Source:** User (flow change). When asked how to treat wrong answers, the user chose "only correct answers".
- **Decision:** On the first 2 problems of each type, when her answer is correct the app does not say "Correct!" yet. The answer boxes hide and "How can you prove it?" opens first. Score, first-try, status and the celebration are recorded and shown only after she finishes the proof (a correct proof, or the worked add-back after two wrong proofs). Wrong answers are unchanged: "Not quite" and hints show right away, and the add-back after three hints (D-16) still applies. While a proof is pending she cannot skip, move on or submit that problem (Back still works), and the problem counts as unanswered until the proof is done.
- **Why:** Once she knows an answer is right she has no reason to prove it. Proving first makes the add-back her own way to find out.
- **Alternatives:** Send every answer, right or wrong, to the proof first so the proof never gives away the result (offered as the recommended option, not chosen).
- **Status:** Active. Known gap: because wrong answers get "Not quite" immediately, seeing the proof step instead tells her she is right. The user accepted this, explaining that this is a practice test (see D-00).

### D-25: A slip in the proof gets encouragement that says the slip is in the check, not her answer
- **Date:** 2026-10
- **Source:** User
- **Decision:** When her proof is wrong (while the result is still held back, per D-24), show a short encouraging line such as "The slip is in the proof, not your answer. Keep going!" together with the hint question about the add-back. Lines vary and never repeat back to back. The first wrong proof does not count as a wrong answer. A second wrong proof shows the worked add-back and then tells her the answer was right. An "equal but not simplest" proof is only a nudge and gets no slip message.
- **Why:** She is about to be right. A wrong proof should not make her think the original problem was wrong or make her give up.
- **Alternatives:** Only the plain hint question (what we had).
- **Status:** Active. This tells her that her answer is right before the result is shown, which is the gap accepted in D-24. The user confirmed it is fine because this is a practice test that should keep her motivated (D-00).

---

## Tutor API (feature-0010)

### D-26: AI reads, hints and gives feedback; the engine decides correctness
- **Date:** 2026-10
- **Source:** User spec (Tutor flow in docs/PLAN.md)
- **Decision:** Three server routes: `POST /api/tutor/read` (photo or text to a problem), `/hint` (one guiding question) and `/explain` (feedback on her reasoning). The AI never grades the number and never does fraction math. Every operand it reads is parsed by the fraction engine, and the steps, correct answer and slip diagnosis for hints come from the engine on the server.
- **Models:** `claude-sonnet-5-5` reads photos and word problems. `claude-haiku-4-5-20251001` (the ID the user named) writes hints and explanation feedback. Both are constants in `server/utils/anthropic.ts`.
- **Why:** Keeps D-01 true while still using AI where it helps (reading handwriting, wording a hint).
- **Alternatives:** Letting the model check answers; one model for everything.
- **Status:** Active. Not done: the optional server-side refusal fallback for Sonnet 5.5. A refusal is treated as "could not read" (read) or falls back to the template (hint, explain).

### D-27: Hints must never state the answer or the step result, and always fall back to a template
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** A hint is one question of at most 20 words. A guard checks every AI hint for the final answer (simplest mixed, "3 and 9/20", improper such as 69/20) and for the result of the flagged step (for example 9/20 and its top number 9, also spelled out). A leak or a badly shaped hint is regenerated once, then replaced by a hand-written template for the flagged step and level. If the API fails or takes longer than 8 seconds, the template is used immediately. The tutor therefore always works.
- **What counts as "the step's result":** the numbers that are new in that step (the right side of "=", or what changed compared with the step before). Numbers from earlier steps are allowed, so level 2 can say "Is 4/20 enough to take away 15/20?" when the regroup step is the focus.
- **Alternatives:** Trusting the prompt alone.
- **Status:** Active. Known gap: the guard matches numbers and spelled numbers, not every possible phrasing (for example "nine twentieths").

### D-28: Explanation feedback judges reasoning only, kindly
- **Date:** 2026-10
- **Source:** User spec, plus D-00
- **Decision:** The model gets a checklist built from the engine's steps (common denominator, regrouping, simplest form, checking). It returns `clear`, `partly` or `missing`, praise of at most 12 words, and one follow-up question when not clear. Replies with harsh words ("wrong", "incorrect", "mistake"), long praise or bad shape are retried once, then replaced by a kind template. An explanation under 3 words gets a gentle follow-up with no API call.
- **Status:** Active

### D-29: Privacy, cost and demo safeguards on all three routes
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** Email addresses, phone numbers and introduced names ("my name is Mia", "Hi Sam", "Name: ...") are removed from text before it goes to an AI. Photos cannot be scrubbed, so the prompt tells the model to ignore personal details and the returned problem text is cleaned. Images and student text are never logged; only the route, the error type and the HTTP status are. A shared in-memory limit allows 30 requests per 10 minutes per IP address (429 with `Retry-After`). `DEMO_MODE=true` returns canned answers with no API calls. The API key is server-only runtime config (`NUXT_ANTHROPIC_API_KEY`), never sent to the browser.
- **Status:** Active. Known gaps: name removal is a heuristic and misses names with no introduction; the rate limit lives in one server's memory, so it resets on restart and is per instance on serverless hosting.

### D-30: Reading supports one addition or subtraction of two numbers
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** Anything else (multiplication, division, decimals, chains such as 1 - 1/6 - 7/10, or a subtraction that goes below zero) returns `unsupported` with a kid-friendly message. Photos over 5 MB are rejected before any API call. Invalid JSON is retried once, then returns `unreadable`. Low-confidence reads are returned with `confidence: "low"` so the app can ask her to confirm.
- **Status:** Active

---

## Open questions

- Persist ideas, parent reviews and drawings (local storage now, Supabase later)?
- Add a PIN or similar lock to the Parent page once accounts exist.
- Should "first 2 proofs per type" reset per set instead of per session?
- Move the tutor rate limit to shared storage once the app runs on more than one server.
- Add the server-side refusal fallback for the photo reader if refusals show up in practice.
