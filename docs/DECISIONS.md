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

## Tutor page (feature-0011)

### D-31: The Tutor is a state machine, one thing on screen at a time
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** `useTutorStore` moves through capture, confirm, attempt, hint1, hint2, hint3, teach, check, explain, done. Actions only work in the right state (for example she cannot answer on the confirm step). The fraction engine decides every answer; the server routes (D-26) only read, hint and give feedback. The API is injected into the store so tests use a fake. It reuses the Practice pieces: the answer boxes, the problem card, `LearnPanel` (without "Try one like it" and "Back"), the proof component for the add-back, and `diagnose`.
- **Status:** Active

### D-32: The confirm step always appears, however the problem was captured
- **Date:** 2026-10
- **Source:** User spec ("never skip")
- **Decision:** A photo, a typed word problem and typed numbers all go to "Is this your problem?" with Yes and Fix it. A low-confidence read adds a warning. "Fix it" changes the numbers and she confirms again. Typed numbers are checked first (no zero bottom number; the bigger number first when subtracting).
- **Why:** The AI can misread handwriting, and a child may mistype.
- **Status:** Active

### D-33: The hint ladder
- **Date:** 2026-10
- **Source:** User spec, from docs/PLAN.md
- **Decision:** A wrong answer or "I'm stuck" moves up one step: attempt, hint1, hint2, hint3, then teach. A correct answer at any point goes to the check. "Equal but not simplest" never counts as wrong: it stays where she is and asks her to simplify. In teach, a wrong answer stays in teach with the steps in view, and "I'm stuck" is hidden. A wrong answer sends the tutor her answer so the hint aims at the slip; "I'm stuck" aims at the first step.
- **Status:** Active

### D-34: The check is required, and she can pick add back or estimate
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** She cannot reach the explanation until the check is done. The proof (labelled "Give proof" since D-50) reuses the proof step (one wrong try gets encouragement and a hint, two show the worked add-back). Estimate: she rounds each number to the nearest half or whole herself (ties round up), the app shows the estimate, and she says whether her answer is close. "Close" means within half a whole, because each rounding is off by at most 1/4, so a correct answer is always close (a property test checks this). `estimateCheck` and `roundToHalf` live in `fraction.ts`. Two wrong roundings show the roundings, and two wrong "close?" choices finish the check, so she is never stuck.
- **Status:** Active

### D-35: Explain-back gets one extra try, and the mic is optional
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** After a follow-up question she gets one extra try, then moves on. She can also skip after a follow-up, or when the tutor cannot be reached. The microphone uses the browser's Web Speech API only where it exists, off until she taps it, with a note under it.
- **Why:** Typing is always possible. Some browsers send the voice to their speech service.
- **Status:** Active. Known gap: voice may leave the device depending on the browser. Decide whether to keep it for a child's device.

### D-36: Offline and photo handling
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** Photos are shrunk in the browser to at most 1568px on the long edge and saved as JPEG at quality 0.8 before upload. If the tutor can't be reached, hints come from the same hand-written templates (moved to `app/utils/tutorHints.ts` and shared with the server), and she is told so. Reading a photo and the explanation show a friendly "no internet" message instead.
- **Status:** Active. Not done yet: saving hints used and the mistake type to a mastery record (planned in docs/PLAN.md).

---

## Multiplication and division engine (feature-0012)

### D-37: Multiplication and division are added next to add and subtract, not into `Op`
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** `Op` stays `'add' | 'subtract'`. New types `MulOp` (`'multiply' | 'divide'`), `AnyOp`, `MulProblem` and `AnyProblem` cover the new operations. `diagnose`, `verifyByInverse`, `estimateCheck` and `workedSteps` accept all four. Code that only handles add and subtract (Practice, the Tutor routes and their zod schemas) cannot receive a multiply by mistake, because it would have been read as a subtract.
- **Why:** Many places contain `op === 'add' ? add : subtract`. Widening `Op` would make those silently wrong for a new operation.
- **Status:** Active. Wired into the generator, Practice, Learn, the Tutor and the playground by D-42 to D-45.

### D-38: Dividing by zero is an error result, never a throw or Infinity
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** `divide` and `reciprocal` return `{ ok: true, value } | { ok: false, error: 'divisionByZero', message }`. `multiply` always has an answer, so it returns a fraction like `add` does. A zero divisor (0, 0/4, 0 0/5) is caught everywhere: `divideSteps` gives one kind step, `diagnose` says `unknown`, `verifyByInverse` says the check does not hold, and nothing throws.
- **Status:** Active

### D-39: Worked steps for multiplication and division
- **Date:** 2026-10
- **Source:** User spec (Singapore Math method)
- **Decision:** Multiplication: change mixed and whole numbers to fractions, cancel common factors across (the step names which numbers cancelled), multiply across, simplify, convert to a mixed number. Division: the same, with a "keep, change, flip" step first. Whole numbers are written n/1. New step kinds: `toImproper`, `cancel`, `multiplyAcross`, `flip`, `divideByZero`. Hand-written hints exist for each at three levels.
- **Status:** Active

### D-40: Slips for multiplication and division are matched by recomputing the wrong method
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** `diagnose` recomputes what each common slip would produce and compares it to her answer: parts multiplied separately (2 1/2 × 3 1/3 as 6 1/6), a mixed number not converted, not flipping (2/3 ÷ 4/9 as 8/27), flipping the first fraction (as 2/3), and cancelling top with top or bottom with bottom. Anything else with the right bottom number is `numeratorArithmetic`; a right but unsimplified answer is `notSimplified`.
- **Status:** Active. Known gap: these are the patterns we thought of. An answer that fits none is `unknown`.

### D-41: Estimating and the size rule for multiplication and division
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** For multiplication and division, "close" means inside the range the answer could really be in, given each number is rounded to the nearest half or whole and so can be off by up to 1/4. A fixed 1/2 does not work for products (8 1/5 × 4 3/4 is about 39 but 8 × 5 is 40). A correct answer is always close (a property test checks it). A divisor under 1/4 rounds to 0, so the estimate is marked `reliable: false` and is never called wrong. `sizeCheck` applies the deep-understanding rule: multiplying by a fraction between 0 and 1 must make the number smaller, and dividing by one must make it bigger. It returns a kid-friendly message when the answer breaks the rule, and does nothing otherwise.
- **Status:** Active

---

## Multiplication and division everywhere (feature-0013)

### D-42: The generator makes multiplication and division at eight levels, and "all"
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** `generateProblem` accepts `multiply`, `divide` and `all` (a mix of all four). Multiply levels: fraction × whole, fraction × fraction, mixed × whole, mixed × mixed. Divide levels: whole ÷ fraction, fraction ÷ whole, fraction ÷ fraction, mixed ÷ mixed. Denominators run from 2 to 12, wholes from 2 to 9 (never 0 or 1), and every fraction has a numerator of at least 1, so nothing is ever divided by zero and no answer is zero. `levelOf` names a problem's level, and "Try one like it" stays at the same level. `mixed` still means a mix of adding and subtracting, for older code.
- **Status:** Active

### D-43: Practice works for all four operations
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** The picker shows Add, Subtract, Multiply, Divide and All (the old "Mixed" button is replaced by All). The proof is the opposite operation (r ÷ b for multiplying, r × b for dividing) and is asked on the first 2 problems of each of the four types. Retry, Learn, hints, worked steps and the add-back after three hints all use the engine's steps and `diagnose`. After a wrong multiply or divide answer, `sizeCheck` runs and its message is shown in the feedback if the answer is the wrong size. Story problems have templates for multiplying and dividing too, and the end-of-set ideas cover them.
- **Status:** Active

### D-44: The Tutor reads and teaches multiplication and division
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** The read route accepts `multiply` and `divide`. The prompt tells the model that ×, x, · and "of" mean multiply (so "2/3 of 12" is 2/3 × 12), that ÷ and "divided by" mean divide, and to write simple words like "half" as fractions. Dividing by zero returns a kind "zero_divisor" message instead of starting an unsolvable problem. Hints, teach steps and the explanation checklist use the new steps and `diagnose`. The leak guard treats numbers already on the left of "=" as known (so "3/5 × 10 = 3/5 × 10/1" only guards 10/1) and no longer guards a bare 0 or 1 as a step result ("1 whole" is a normal hint). The estimate way is hidden when the numbers are too small to estimate (a divisor under 1/4); she uses the opposite operation instead. The typed-problem form has Add, Subtract, Multiply and Divide.
- **Status:** Active

### D-45: The engine playground is dev-only
- **Date:** 2026-10
- **Source:** User spec
- **Decision:** `/dev/engine` shows the answer (mixed and improper), every worked step, `verifyByInverse`, `estimateCheck`, `sizeCheck`, and for a student answer `checkAnswer` and `diagnose` (slip, step index, hint). It has a Random button that uses the generator and example buttons for the engine test cases. All of the analysis is in a pure function (`analyze`) with tests, and each example's expected answer is verified against the engine. In a production build a Nuxt hook removes every `/dev` route (so it is an ordinary 404), and the page also refuses to render unless `import.meta.dev` is true.
- **Status:** Active

### D-46: Wrong-operation hints for multiplication and division
- **Date:** 2026-10
- **Source:** User (hint wording chosen by the user)
- **Decision:** `diagnose` now recognises a multiplication or division answer that is the right answer to a different operation, and returns the slip `wrongOperation` with no step index. If she **added** on a multiplication, the hint stresses that multiplying is repeated adding: "Multiplying is repeated adding. How many times should you add it?" If she multiplied and got the answer to a subtraction or a division (either way round), or divided and got the answer to an addition or subtraction, the hint is "Are we taking a part of it, or splitting it up?" A division answered by multiplying stays `forgotReciprocal`, because that is more specific. A correct answer is never a wrong operation, even when two operations agree (2 × 2 = 2 + 2). The second hint has clue words for each operation ("each", "of" and "times" for multiplying; "shared equally" and "how many fit" for dividing). The Tutor's three hint levels have templates for each operation, and the AI hint writer is told the same ideas.
- **Why:** Story problems hide the operation card (D-17), so she has to choose the operation herself, and "added instead of multiplied" is the most likely mix-up.
- **Alternatives:** One general "check the operation" hint for all four.
- **Status:** Active. The add/subtract gap is closed by D-51.

---

## Fixes from manual testing (issues #12, #15, #16, #17, #18)

### D-47: The Tutor explains the question and she finds the operation first (#18)
- **Date:** 2026-10
- **Source:** User (issue #18)
- **Decision:** A new step, "Let's understand it", sits before she solves (before the attempt; its place relative to confirm changed in D-52) (state machine at the time: capture, confirm, understand, attempt, ...; the order changed in D-52). The tutor explains the question in two or three short sentences and helps her picture it ("Imagine you have 6 cups..."). The explanation never names the operation and never gives the answer, a step or a result. The numbers show with a "?" where the operation goes. She picks Add, Subtract, Multiply or Divide, and the engine checks. A wrong choice gets a hint question (the wrong-operation hints from D-46); after two wrong choices the tutor says which operation it is and why, so she is never stuck. A right choice gets praise and the reason. Only then does she solve.
- **How the explanation is made:** a new route, `/api/tutor/understand`. The AI (Haiku) writes it from her problem's words. Our checks reject any explanation with an operation word, an answer or a step result, or that is longer than 60 words; it retries once, then uses a plain template. Typed numbers have no story, so they use the template with no API call. The same limits apply as on the other routes (shared rate limit, 8 second limit, personal details removed, demo mode canned, nothing logged).
- **Also from #18:** after a correct answer the Tutor now gives a short, varied success line, like Practice. A wrong answer already gets "Not quite." and a hint.
- **Alternatives:** Writing the explanation by hand for every problem (cannot cover photographed and word problems).
- **Status:** Active

### D-48: Learn shows the question, why the operation, her answer against the correct one, then the steps (#16)
- **Date:** 2026-10
- **Source:** User (issue #16)
- **Decision:** The Learn panel now has four parts: "The problem" (the story or her own words, with the numbers), "Which operation, and why?", her answer next to the correct one when she was wrong (or "not finished yet" next to the simplest form when it was right but unfinished), and "How to do it" one step at a time. Each story has its own reason for its operation; other problems get a general reason per operation. Learn now shows the problem itself, so it also works from the end-of-set summary where no problem was on screen.
- **Status:** Active

### D-49: The end-of-set question names the operations she practiced (#15)
- **Date:** 2026-10
- **Source:** User (issue #15)
- **Decision:** "Where would you use multiplying fractions?" instead of always "add or subtract". It names only the operations in the set ("adding and subtracting", "multiplying and dividing", all four for a mixed set).
- **Status:** Active

### D-50: The proof button is generic, and the problem stays visible while she explains (#17, #12)
- **Date:** 2026-10
- **Source:** User (issues #17 and #12)
- **Decision:** In the Tutor the check button is "Give proof" (it was "Add back", which is wrong for multiplying and dividing), the summary says "Proof", and the panel for checking a wrong answer is titled "Check with the opposite operation". The explain step shows the problem, her original wording and her answer, so she can answer a follow-up like "how did you find the common denominator?" without going back to her photo.
- **Status:** Active

### D-51: Add and subtract answered with a multiplication or division result
- **Date:** 2026-10
- **Source:** User (the gap noted under D-46)
- **Decision:** For an add or subtract problem, `diagnose` now also recognises an answer that equals the product, or the quotient either way round, as `wrongOperation` with no step index. The hint is "We aren't repeating or splitting. Are we putting together or taking away?" (12 words, one question). Adding and subtracting mixed up with each other keeps its own hint, "Are we putting together or taking away?". The second hint is unchanged ("in all" adds, "left" subtracts). The Tutor's operation step uses the same hint when she picks multiply or divide for an add or subtract problem, the Tutor's hint templates and the AI hint writer are told the same idea, and a correct answer is never flagged even when two operations agree (2 + 2 = 2 × 2).
- **Status:** Active

### D-52: "Let's understand it" comes before "Is this your problem?" (#20)
- **Date:** 2026-10
- **Source:** User (issue #20)
- **Decision:** The Tutor order is now capture, understand, confirm, attempt. The confirm screen shows the whole problem including the operation, which gave the operation away before she had thought about it. So she first sees the numbers with a "?" where the operation goes, reads the explanation and picks the operation, and only then sees "Is this your problem?". Confirm is still always shown.
- **Misreads:** because she now picks the operation before confirming, a misread symbol could mark a right choice as wrong. So the understand step has a "This isn't my problem" button that goes straight to the confirm screen to fix it, and a low-confidence read says so there. After "Fix it", or after jumping ahead, she thinks about the corrected problem before confirming again.
- **Typed numbers** skip the understand step: she chose the operation herself when she typed it, and there is no story to explain. They go from capture to confirm to the attempt.
- **Status:** Active. Replaces the order in D-47.

### D-53: The Tutor can solve problems in several steps
- **Date:** 2026-10
- **Source:** User (a photo of a marathon fraction problem that needs four steps)
- **Decision:** A problem that needs 2 to 5 steps is now read as a plan. Each step is one operation on two numbers (add, subtract, multiply, divide), and a number can be "the answer to step N". She confirms the whole problem, then solves one step at a time with the usual flow for a step: find the operation, answer, hint ladder, teach. Her correct answer to a step becomes a number in the next step. After the last step she sees all her steps and the final answer. Replaces the limit in D-30 (one operation on two numbers); a single operation still works as before.
- **Who decides what:** the AI only splits the problem into steps and writes a short question for each ("What fraction of the people finished?"). The engine checks the plan (every step must work out, no negatives, no dividing by zero, no step that goes nowhere, at most 5 steps) and decides every answer. A plan that fails the check is treated as unsupported. The AI can still choose a plan that does not fit the story; only the arithmetic is guaranteed, so the confirm screen shows the problem in words for her (or a parent) to check.
- **Step questions** have no digits and never name an operation; if one does, it is replaced with "What do you need to find in step N?". Hints reuse the single-step route, so the leak guard, PII stripping and rate limit apply unchanged.
- **Check at the end (user):** no proof, estimate or explain-back for multi-step problems (that would be a check after every step). Instead, after the last step she can "Try one like it": the same steps with new small fractions, made and checked by code (`similarPlan`), solved the same way. She can skip it and finish.
- **Status:** Active

### D-54: Fewer AI calls in the Tutor: no explain-back, and the question explanation only on request
- **Date:** 2026-10
- **Source:** User
- **Decision:** (1) The explain-back step is removed for every Tutor problem. The proof or estimate is now the last step before "All done". A multi-step problem already ended with a similar problem (D-53). (2) For a single-step story problem the explanation of the question is no longer fetched automatically. The "Let's understand it" screen has an "I don't understand the question" button, and the one AI call is made only when she taps it (asking again does not call again). A multi-step problem shows each step's question straight away, with no AI call.
- **Calls now:** a photo or word problem needs 1 read call. Single step: +1 only if she asks for the explanation, +1 per hint. Multi-step: 1 read call for the whole problem, +1 per hint.
- **Trade-offs:** less feedback on how she reasons (the explain-back was the only check of her reasoning, apart from the proof); she must ask for help with the story. The `/api/tutor/explain` route is still on the server but no page calls it.
- **Status:** Active. Replaces the explain-back in D-35 and D-50 and the automatic explanation in D-47.

### D-55: A photo is copied out as text first, and she checks it before it is solved
- **Date:** 2026-10
- **Source:** User
- **Decision:** Reading a photo is now two steps. The first call (Sonnet, with the picture) only copies the problem out as plain text, ignoring any working or drawings around it. She sees it on "Is this your problem?" in a box she can edit. When she taps "Yes, use this", the second call (Sonnet, text only) reads that text into a single problem or a multi-step plan, exactly as typed text is read. A multi-step plan then starts at step 1, because she has just confirmed the words. A single problem goes to understand and confirm as before.
- **Why:** the same photo sometimes came back as one calculation and sometimes as a plan, and a misread number only showed up after the plan was made. Reading from text is steadier (the same text gave a plan every time) and she can fix a misread.
- **Cost:** two calls instead of one, about 25% more for a photo (roughly 1.8 cents against 1.4 cents, by token counts). Typed problems are unchanged. Open idea: a smaller model for the second call.
- **Status:** Active

### D-56: The similar problem shows its question, and the hint sits under the question
- **Date:** 2026-10
- **Source:** User
- **Decision:** "Try one like it" now shows the question again with the new numbers ("Another one like it: ..."). Code makes it: each fraction in the story is swapped for a new one, and the same fraction is swapped the same way everywhere it appears (so "1/5 did not finish" in the story and in two steps stay one quantity). Fractions written as words ("one fifth") cannot be swapped safely, so the story then falls back to "Here is another one like it, with new numbers." with only the step questions. No AI call. In a multi-step problem the hint box now sits under the question and above the numbers card; single-step problems are unchanged.
- **Fixed on the way:** the similar plan used to swap each occurrence of a fraction separately, so a fraction used in two steps could become two different numbers.
- **Status:** Active

### D-57: Parent account, parent PIN and saved attempts (Supabase)
- **Date:** 2026-10
- **Source:** User (issue 0018)
- **Decision:** One parent login per family (Supabase Auth, email and password). The database enforces everything: row level security by family, and a parent PIN checked in `unlock_parent_mode` (15 minutes, locked for 15 minutes after 5 wrong tries). The app uses only the publishable key. Only `/parent` needs a login; Practice and Tutor still work signed out and then save nothing. Each finished problem saves one `attempts` row for the chosen child (plain text like "8 1/5 - 4 3/4", correct, first try, hints, the slip `diagnose` named); a failed save is kept and retried with the next one, with a small note. The chosen child id is the only thing kept in the browser. A dev-only page `/dev/security` checks that locked writes are blocked.
- **Alternatives:** a PIN checked in the browser (rejected: not a real protection); login for the child (rejected: a child has no account).
- **Ideas and stars:** her ideas are saved to an `ideas` table (the child's session can add one, always unreviewed). Nobody can edit an idea directly (no update policy); a star is given only by `give_star(idea_id, approved)`, which needs `is_parent_unlocked()` and an idea in the family. The Parent page reads ideas from the database, and the header badge counts the waiting ones. The set summary still counts stars from the open tab, so a star given later by a parent is not shown there.
- **RLS tests:** `supabase/tests/rls_tests.sql` runs three parents in the SQL Editor and rolls back everything it made.
- **Status:** Active.

### D-58: Her stars are shown on the home screen
- **Date:** 2026-10
- **Source:** User
- **Decision:** The home screen is one calm column so she is not pulled away from practice: her animal, one heading "Welcome, <nickname>" with one line under it ("Let's grow your math."), one big "Start practicing" button, and a small gift pill under it. "Open your gift" makes five small stars hop out for about a second, then the pill shows the count in one line: "3 stars. Nice work!" (1 star: "1 star. Nice start!"; none: "Your first star is waiting"). It closes again on each visit. With reduced motion on, the count shows at once. "Who's practicing?" is the whole page only while no child is picked; with several children a small "Not <nickname>? Switch" link sits under the pill. A star is one idea a parent gave a star to (`ideas.approved = true`) or one Proof Master she earned (3 correct proofs in a row, saved in the new `awards` table). The split between the two is in the pill's hover title. The proof streak stars in Practice are not counted.
- **Rules:** a Proof Master is saved once per visit (the badge stays on until the page is reloaded), with one retry, and never blocks her. The child's session adds awards like it adds attempts, so they are encouragement, not an exam record; nobody edits an award, and only parent mode can delete one. Counts are read through RLS, so a family sees only its own. A count that cannot be read counts as 0; if neither can be read, no gift is shown.
- **Status:** Active

### D-59: A cute animal for each child, and a plainer header
- **Date:** 2026-10
- **Source:** User
- **Decision:** A parent picks one of 12 animals (an emoji) for each child when adding or editing them (`children.avatar`). It shows in the header next to the nickname, on the child buttons and in the home welcome. Until one is picked a sprout shows. Only an animal from the fixed list is ever shown, so other data cannot reach the screen. The header now reads "<animal> <nickname> · <family>" with no "Welcome" (the welcome is on the home screen), and Sign out is underlined text in line with the nav, on the right.
- **Why emoji:** no images to download or host, no photos of a child, and it works with screen readers through the animal's name.
- **Status:** Active

### D-60: Today mode, and a 5-minute summary for parents
- **Date:** 2026-10
- **Source:** User
- **Today (her side):** a `/today` page with an ordered checklist. She adds her own tasks (type, a short title, a date for homework or a test) with `add_task()`, which works without parent mode but only for a child in her own family and never sets a priority. She ticks tasks with `complete_task()`, which now also records when (`done_at`). Tasks she finished today show below, struck through.
- **Order (code decides, no AI):** IXL first on a screen-time day, otherwise later; homework in between (earlier when due); MAP skills 3 times a week (earlier when she is behind for the week, last once she has done 3); test prep earlier as the test nears (2 days or less comes right after IXL, then 5, then 10); Olympiad set after homework; reading last, as part of the bedtime story. A small line under each task says why it is there.
- **Parent sets it daily:** on the Parent page, "Today's plan" has a screen-time day box, the ordered list with Up and Down, "Save today's order", "Use the rule order", Delete and Add. A saved order is stored with today's date, so tomorrow it goes back to the rules unless the parent sets it again. Screen-time day is one row per child per day in `daily_plans`. Both are parent-only in RLS, not only in the UI.
- **Summary:** the "last 20 attempts" list is gone. Each child has a 5-minute summary of the last 20 problems: done and how many were smooth, how many struggled (a hint, a second try or missed), tutor-help problems, rules mastered (a skill with 3 or more smooth problems and none needing help), skills that need practice (2 or more problems and half needed help), and the top 3 mistake patterns from the slips the engine named. Skills come from the saved problem text (operation, mixed numbers, unlike denominators). All counted by code.
- **Homework checklist and telling the parent:** on `/today` she types her homework as a checklist (one line per item, Enter adds a line, up to 10) and sends it. Each item becomes a homework task marked as new for the parent (`seen_by_parent = false`). The parent sees it as a number on the Parent link in the header, a yellow "New from <child>" box in Today's plan and a "New" tag, until they press Seen or save the day's order. This is in-app only: there is no email or phone push yet (that needs an email service and a Supabase Edge Function).
- **Parent notes:** each task has a short note (200 characters) a parent can type; it shows under the task on her list as "Note from your parent". Only parent mode can write it (RLS).
- **Usual tasks (templates):** a parent sets each child's usual tasks once (`task_templates`: type, name, optional minutes, and "she types the pages"). "Add the usual set" adds IXL, Math homework book (pages), Reading 30 min, Write a summary of the novel, Olympiad practice and MAP practice 30 min, skipping any already there. On `/today`, "My usual tasks" shows them as big buttons. One tap adds the task; for one that asks for pages she types only that (title becomes "Math homework book: pages 45 to 47"). A task already on her list shows "on your list". It is still marked new for the parent. Templates are read by the family and written only in parent mode (RLS). The free typing boxes stay for anything not on the list.
- **Numbers and a clock for her:** when a parent saves today's order, each task gets its number (1 = first) and, if the parent typed one, a start time (`tasks.start_time`). She sees a big number circle, the clock as "4:30 pm", a "Do this first" tag on number 1, and "Sent to your parent" on tasks still waiting. Both the order and the time count only for the day they were saved; tomorrow it goes back to the rules. Writing them is parent-only (RLS).
- **Shopping-list ticking:** on `/today` there is one list. Ticking a task crosses it out where it is (grey, struck through) and tapping again brings it back (`uncomplete_task()`). Positions do not move, because MAP counts only up to this morning. It ticks at once and goes back if saving fails. The first task not yet done says "Do this next".
- **Telling the parent the day is done:** after the last task is ticked, the app calls `report_day_done()`. The database checks for itself that nothing is open for that child and that something was finished in the last day, and the date must be close to today. It marks the day (`daily_plans.completed_at`, `completion_seen = false`). The parent sees a green "<child> finished all of today's tasks at 6:10 pm" box with Seen in Today's plan, and the badge on the Parent link counts it. Unticking a task takes the report back. This is in-app only; email or phone push still needs an email service and an Edge Function.
- **A star for finishing the day, given by a parent (replaces the automatic star):** finishing every task only reports the day (`report_day_done()`). A parent sees "<child> finished all of today's tasks" with a "Give a star" button, takes a look, and `give_day_star()` adds one `awards` row of kind `day_done`. It needs parent mode, a day she really finished, and the family's own child; there is at most one per child per day (a unique index). The child's session cannot add a `day_done` award by hand (the insert policy allows only `proof_master`). Why: a tiny task ticked just for the star would earn one automatically; now a parent decides. Today says "Your parent will take a look and give you a star" until the star is given, then "You earned a star for finishing the day." The home gift counts these as "finished days".
- **Open:** MAP "3 times a week" is counted from MAP tasks she ticks done; it does not create MAP tasks by itself. Recurring tasks are not built.
- **Status:** Active

### D-61: A cleaner Parent page, and stars that are protected
- **Date:** 2026-10
- **Source:** User
- **Page:** the Parent page has a side panel with five sections: Prioritise tasks, Add new task (one-off task and usual tasks), Progress (the 5-minute summary per child), Real-life examples, and Family account (family name, children, sign out). The open section is in the address (`?tab=`). On a phone the panel becomes a row you scroll sideways. Badges show new tasks, finished days and ideas waiting. A child switcher shows only when there is more than one child. Copy is cut to short phrases.
- **Examples kept short:** each reviewed idea beyond the 3 newest per child is deleted when a parent reviews an idea (in `give_star`). Ideas still waiting for a review are never deleted. The page shows the waiting ones and the 3 newest reviewed ones.
- **Stars are protected:** every star a parent gives (idea or day) is a row in the `awards` ledger. An idea star (`idea_star`, with the idea's id but no foreign key) stays after its idea is deleted. The home count and "N stars given so far" read the ledger, not the ideas. Nobody can delete a star from the app (the delete policy on `awards` is gone). A review can be changed only within 7 days of the first review (`Reviews are final after a week`), and changing it takes the star back or gives it again; the week does not restart when flipping. Day stars have no take-back button.
- **Status:** Active. Replaces the parent delete of awards (D-60) and the star count from the ideas table (D-58).

### D-62: The site must not answer 500 when Supabase is not configured
- **Date:** 2026-10
- **Source:** Bug (Vercel preview returned 500 on every page)
- **Decision:** `SUPABASE_URL` and `SUPABASE_KEY` (the publishable key) are read when the site is built. If either is missing, the Supabase module used to fail and every page and API route answered 500. Now `nuxt.config.ts` falls back to a harmless local address, so Practice and Tutor keep working, and the login page says "Sign-in isn't set up on this site yet." The fallback holds no secret. On Vercel the two variables must be set for every environment that is deployed (Production and Preview), and the site must be redeployed after adding them, because they are read at build time.
- **Status:** Active

---

## Open questions

- Persist ideas, parent reviews and drawings (local storage now, Supabase later)?
- Add a PIN or similar lock to the Parent page once accounts exist.
- Should "first 2 proofs per type" reset per set instead of per session?
- Move the tutor rate limit to shared storage once the app runs on more than one server.
- Add the server-side refusal fallback for the photo reader if refusals show up in practice.
