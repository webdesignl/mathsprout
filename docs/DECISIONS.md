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
- **Page:** the Parent page has a side panel with five sections: Prioritise tasks, Usual tasks (the task templates; one-off tasks are added at the top of Prioritise tasks), Progress (the 5-minute summary per child), Real-life examples, and Family account (family name, children, sign out). The open section is in the address (`?tab=`). On a phone the panel becomes a row you scroll sideways. Badges show new tasks, finished days and ideas waiting. A child switcher shows only when there is more than one child. Copy is cut to short phrases.
- **Examples kept short:** each reviewed idea beyond the 3 newest per child is deleted when a parent reviews an idea (in `give_star`). Ideas still waiting for a review are never deleted. The page shows the waiting ones and the 3 newest reviewed ones.
- **Stars are protected:** every star a parent gives (idea or day) is a row in the `awards` ledger. An idea star (`idea_star`, with the idea's id but no foreign key) stays after its idea is deleted. The home count and "N stars given so far" read the ledger, not the ideas. Nobody can delete a star from the app (the delete policy on `awards` is gone). A review can be changed only within 7 days of the first review (`Reviews are final after a week`), and changing it takes the star back or gives it again; the week does not restart when flipping. Day stars have no take-back button.
- **Status:** Active. Replaces the parent delete of awards (D-60) and the star count from the ideas table (D-58).

### D-62: The site must not answer 500 when Supabase is not configured
- **Date:** 2026-10
- **Source:** Bug (Vercel preview returned 500 on every page)
- **Decision:** `SUPABASE_URL` and `SUPABASE_KEY` (the publishable key) are read when the site is built. If either is missing, the Supabase module used to fail and every page and API route answered 500. Now `nuxt.config.ts` falls back to a harmless local address, so Practice and Tutor keep working, and the login page says "Sign-in isn't set up on this site yet." The fallback holds no secret. On Vercel the two variables must be set for every environment that is deployed (Production and Preview), and the site must be redeployed after adding them, because they are read at build time.
- **Status:** Active

### D-63: Migrations and RLS tests run in `npm run test:run`
- **Date:** 2026-10
- **Source:** Bug (finishing the day failed with `column reference "child_id" is ambiguous`)
- **Decision:** Three database functions used a parameter name that is also a column name (`child_id`, `plan_date`, `approved`), which Postgres only reports when the function runs. `tests/database.test.ts` now runs every migration in order in an in-memory Postgres (PGlite, a dev dependency) with small stand-ins for Supabase's auth schema and roles, then runs `supabase/tests/rls_tests.sql`. It fails with the same error as before the fix. The affected functions now say `#variable_conflict use_column` and refer to their own parameters by function name (`report_day_done.child_id`).
- **Limits:** PGlite is not Supabase. The stand-ins copy only what the migrations use (roles, `auth.users`, `auth.uid()`, `auth.jwt()`), so a test pass is strong evidence, not proof. Run the same script in the Supabase SQL Editor after applying new migrations.
- **Status:** Active

### D-64: Clearing finished tasks, and unfinished ones carry over
- **Date:** 2026-10
- **Source:** User
- **Decision:** An unfinished task stays open, so it shows on the next day's list by itself, with a small blue tag ("From yesterday", "From 3 days ago"). Finished tasks from earlier days are not shown. On the same day she can press "Clear finished" to hide them (`archive_done_tasks()`); they stay in the database, so "MAP 3 times a week" still counts them, and the day still counts as finished. Finished tasks older than 14 days are deleted (`tidy_tasks()`, run quietly when Today loads). A parent's order and start times are for one day, so a carried-over task goes back to the rule order the next day. Both functions only touch the caller's own family.
- **Status:** Active. The 14-day delete (`tidy_tasks`) is replaced by D-65.

### D-65: Task categories, backlog, pause and a 30-day history
- **Date:** 2026-10
- **Source:** User (after a project-manager review of the carry-over flow)
- **Categories (picked when a task is added, with a usual default per kind):**
  - **Daily routine** (IXL, reading, MAP practice): never carried over. If not done it expires at the end of the day. A usual task can be marked "Add every day", and then today's copy is added by itself (`ensure_routines`, once per day).
  - **Time-sensitive** (test prep, Olympiad): a due date is required (the database refuses one without it, or in the past). The task expires after the due date. It is never carried over or sent to the Backlog.
  - **Important** (homework pages, writing a summary): carried over for 3 days with "From yesterday" and "From 2 days ago". From day 4 it is in the **Backlog**.
- **For her:** carried-over tasks are not mixed into her numbered list. A friendly "Did you forget yesterday's homework?" box with "Show me (N)" lists them when she taps it, and she can tick them there. The Backlog is not shown to her.
- **For a parent:** a Backlog section (badge on the sidebar and the Parent link) with Do it today, Done on paper, and Delete for each task. A "Pause" button for a child (holiday or sick): she sees "Taking a break", routines do not repeat, and on Resume open important tasks move forward by the days paused so nothing aged.
- **History:** finished tasks are no longer kept. At the start of a new day (when Today loads), the day's finished tasks become one short summary (Routine, Homework, Extra; at most 1500 characters; MAP count kept for the weekly rule) and the tasks are deleted, along with expired ones. Summaries and daily plans older than 30 days are deleted. A finished day waits in History with Give a star and Seen until a parent acts; once starred or seen it shows no buttons. A day can be starred within a week; after that it says "Not reviewed". If a finished day has waited 5 to 7 days, the Parent page says "Forgot to give this week's Task done stars?!".
- **Notifications:** in app only (badges, banners, the reminder line). No email or text service, so there is no cost. Email or push would need a service and a scheduled function and is not planned.
- **Same rule in two places:** the carry-over rule is in the app (`taskState`) and in the database (`task_state`, used when deciding whether the day is finished). A test compares them for every kind, age and due date.
- **Status:** Active

### D-66: Responsive layout, a menu on the left, and an Add task panel
- **Date:** 2026-10
- **Source:** User (before sharing the project)
- **Text size:** the page root is the browser's 16px, so a person's own text-size setting works. The earlier 18px root was a design choice for a young reader, not an accessibility rule, and it made every page big. Sizes now come from one type scale in `main.css`: pages for her are larger than the Parent page, and phones are one step smaller than tablets and desktops. Body text stays at 16px or more, and controls stay at least 44px to tap.
- **Header:** below 1024px (phones and tablets) there is a menu button on the left that opens a drawer from the left, and a thin strip under the header with the child's name and Sign in or Sign out. The drawer has the four main links, and Sign in or Sign out at the bottom. Parent is a group that opens inside the drawer and stays open, showing its seven sections; there is no section dropdown in the middle of the Parent page on phones. At 1024px and up, the links sit in one row, and the Parent sections are a side panel from 768px. The menu closes on Escape or when a link is chosen, and the page has a "Skip to content" link.
- **Today:** the list and the notices (finished day, "Did you forget", break) are one pane. Adding tasks is another pane with three tabs: Quick add (usual tasks), Homework (the checklist) and New task. It sits beside the list on wide screens and above it on phones, starts open on wide screens and closed on phones, and "Add task" and "Done" open and minimize it, so the list can have the whole page.
- **Status:** Active

### D-67: Practice is a set of chapter cards with search
- **Date:** 2026-10
- **Source:** User
- **Decision:** The Practice start screen has a green header with the title, a "Search chapter" box with a magnifier icon, and a Grade drop-down (only "Grade 4" for now). Below are chapter cards: Fractions (ready), Decimals and Place value (coming soon, cannot be started). Search matches a chapter's name and a few keywords (so "add" finds Fractions). If nothing matches it says "No results found", suggests the chapters, and has a "Clear search" button. The grid is 1 card across on a phone, 2 on a large phone, 3 on a tablet and 5 on a desktop.
- **In the Fractions card:** check boxes for Add, Subtract, Multiply and Divide, "All" (ticks or clears the four), "Word problems", and "Tricky regrouping" (shown only when Subtract is ticked), and a "Practice 10 questions" button. Ticking several operations mixes them: each of the 10 problems uses one of the ticked operations at random. With none ticked, the button says "Tick at least one" instead of being disabled.
- **Status:** Active. Replaces the one-choice operation buttons.

### D-68: Deep Check: fun quizzes that test understanding
- **Date:** 2026-10
- **Source:** User
- **Decision:** A new Deep Check page (in the main menu, and a "Try the fun quiz first" link on the Fractions card in Practice). It has 8 rules (R1 to R8: simplest form, mixed numbers in simplest form, equal forms, same bottom first, regroup one whole, check by adding back, greatest difference, division is a fraction). Each rule has a Learn mode (bar or number-line pictures, the rule, and the wrong idea it fixes) and a quiz of 5 questions, one of each type: Always/Sometimes/Never, Spot the mistake, Which doesn't belong, Reverse it and Draw it. A Chapter quiz mixes 10 questions from all rules. One try per question, then she sees why, right or wrong. No timer.
- **Code grades everything.** Choice questions are checked by index. "Reverse it" answers are read and checked with `fraction.ts` (equal value, not in simplest form, the right bottom number, a division like 3 ÷ 5). "Draw it" is a bar builder (pieces, whole bars, cut into other sizes, regroup, break a bar) whose end state is checked. An answer that cannot be read ("banana") is not counted. AI never grades. A test checks the math behind every "which doesn't belong" item and every explanation with the fraction engine.
- **Folded topics:** on the Deep Check page each topic is a folded row: an arrow and the topic name (with "10 rules · 3 mastered · 2 of 8 challenges solved") and, right beside it, a "Chapter quiz" button. Tapping the row opens and folds the rule cards; The Olympiad challenges are a second folded row directly under the topic heading (visible even when the rules are folded), not at the bottom after all the rule cards. Everything starts folded, so a child sees every topic at once and does not scroll past rule cards to find the next topic. What is open is kept for the visit only (session storage).
- **Rough work in quizzes:** every question and every challenge has the same "Rough work" pad as Practice (pencil, pen, eraser, Undo, Clear, grid). It sits beside the question on a wide screen and is a bottom sheet on a phone. There is one drawing per question or challenge while the tab stays open; it is never saved or sent, and it is cleared when she goes back to the rules page.
- **No answer in the answer box:** the grey example text inside an answer box (a placeholder) used to show an example like "3/8", which was often the right answer, and it vanished when she started typing. Placeholders are gone from every Deep Check quiz and challenge box. Each box has a short note above it in words only, such as "Write a fraction with a slash" (never a number), and a test checks that no note contains a digit.
- **One hint, then the rule:** each quiz question has one hint she can ask for before she answers ("Need a hint?"): a nudge in the form of a question that never gives the answer (a test checks that no hint holds the right choice, the "always/sometimes/never" word, or the answer fraction). The hint can be asked for only once and not after answering. A right answer with the hint is still counted right, but it is saved as not first try with 1 hint used and earns no star; the Parent page says mastery means "without a hint". After a wrong answer (with or without the hint) she sees the explanation and a "Look at the rule: <name>" button that opens that rule's Learn picture right inside the quiz, so she does not lose her place. Olympiad challenges keep their own progressive hints.
- **Topics:** the rules sit under two topics on the page: "Fraction addition and subtraction" (all 8 rules, each topic with its own 10-question Chapter quiz) and, below it, "Fraction multiplication and division" (R9 to R18: the setup rule for improper fractions, what multiplying by a fraction means, what dividing by a fraction means, keep-change-flip, what the whole is right now, "of" means multiply, multiply straight across, simplify before you multiply, times 1/n is divided by n, and the greatest-product plan for digit cards). Each topic has its own 10-question Chapter quiz, and each rule belongs to exactly one topic (`RULE_GROUPS` in `app/data/deepCheck.ts`).
- **Pictures for Learn mode:** bar models (with dotted cut lines), a number line with a gap, an area model (blue part, yellow part, green overlap, with a legend and not color alone), a double number line with jumps, worked wrong/right lines, and a keep-change-flip flow with a balance scale.
- **Olympiad challenges:** eight word problems and puzzles (the shaded grid, the golden ribbon, the snail, the bakery case, the alligator length, the fraction detective, the mystery fractions, and the digit cards) sit under the multiplication and division topic. Each has a story, one or two hints she can reveal one at a time (a hint never gives the answer), answer boxes, and the working after she solves it or asks to see it. Code checks every box (an equal form is accepted, unless the question asks for simplest form); a box that cannot be read is not counted. She can try again until she solves it. Each readable try is saved as an attempt ("C3 challenge"), and the card shows "Solved ✓". The Parent page shows how many she solved.
- **Only the plan that always works is a rule.** The greatest-product plan for digit cards (biggest digit in front, the next biggest as the whole part, the two smallest as the fraction with the smaller on top) was checked against every set of four different digits from 1 to 9 and always gives the greatest product when the two smallest digits make a fraction in simplest form, so it is rule R18. The plans for the smallest product, the greatest quotient and the smallest quotient do not always work (for example with the digits 1, 2, 4 and 5 the greatest quotient does not have the biggest digit in front), so they are not rules and the old rule R19 was removed. They appear only in the challenge "The Digit Cards" (digits 2, 3, 4 and 8: 37 1/3, 8 3/4, 2 10/11 and 8/35, checked by trying every arrangement), where the second hint says to list the allowed arrangements and compare.
- **Items are original** and written for these rules; they are kept in `app/data/deepCheck.ts` (90 items), not in the database yet.
- **Saved:** each answer is an `attempts` row with mode `deep_check` and text like "R2 asn" (rule and question type only; nothing personal). A rule earns a star for each question type answered right at least once, and is "Mastered" at 5. The Parent page's Progress shows this under "Understanding (Deep Check)". The practice summary ignores these rows.
- **Fixed on the way:** two answers saved at the same moment could save the same row twice; saving now waits its turn.
- **Not built (optional, later):** AI-drafted new items that a parent approves. It needs the items in the database (the `items` table has an `approved` flag), a server route that asks the AI for items in a fixed shape, code that checks every drafted item (the answer must be recomputed by `fraction.ts`, not trusted), and a parent approval screen. The AI would see only the rule text, never a child's details.
- **Status:** Active

---

### D-69: Copyright line in the footer
- **Date:** 2026-10
- **Source:** User
- **Decision:** Every page ends with a small footer: "© <year> Priyadharshini Sadhasivam. All rights reserved." The year comes from the current date. It sits in the default layout under the main content, in readable contrast, and is plain text (no link) so it adds no tap target.
- **Status:** Active. The Privacy page link now sits in the same footer (see D-73).

### D-70: The real AI is only for real family accounts
- **Date:** 2026-10
- **Source:** User (public demo, Phase 8 step 1)
- **Decision:** The tutor routes decide on the server, for each request, whether to use the AI. Canned demo answers (and no AI client at all) are used when `DEMO_MODE` is on, when nobody is signed in, when the user is a demo (anonymous) user, and whenever reading the user fails. Only an account that is signed in, has the `authenticated` role and has `is_anonymous` set to false in a token the server verified (`serverSupabaseUser`, which checks the token) reaches Claude. The check never reads the request body, and a missing claim means demo, so the safe default is "no AI". `DEMO_MODE=true` stays as an emergency switch and is checked first, so it does not even read a token. The per-IP limit, the Vercel Firewall rule and the Anthropic spend limit stay.
- **Why:** with a public demo, strangers must never cost money or reach the AI, while the real family keeps the full tutor.
- **Alternatives:** trust a flag from the browser (rejected: anyone can forge it); also require a row in `family_members` (not needed while public sign-up is off, so every real account is invited).
- **Status:** Active

### D-71: The public demo: a private sandbox family for each visitor
- **Date:** 2026-10
- **Source:** User (public demo, Phase 8 step 2)
- **Decision:** On the sign-in page a visitor presses **Try the full demo**. The app calls `signInAnonymously()`, so Supabase makes an anonymous user (`is_anonymous = true`). The sign-up trigger `handle_new_user()` sees that and builds a **demo family** (`families.is_demo = true`, named "Demo family") with sample data: a child called **Sprout** with an emoji avatar (no real name or photo), the **parent PIN 1234** (hashed like `set_parent_pin`, and shown on screen because every sandbox is private), three daily routines plus a homework template, today's tasks with a parent's order and start times (one done, one Sprout added that waits for the parent), a finished day waiting for a star, ideas, stars and a few attempts. `family_members.email` is null. Real sign-ups behave exactly as before. The seed lives in `seed_demo_family(uuid)`, which no client can call.
- **Same rules as everyone:** a demo visitor is an `authenticated` user, so row level security keeps their family apart from every other demo family and every real family with no special cases (tested with three families in PGlite, including a mutation check).
- **No photos:** the insert policy on `uploads` now also requires that the family is not a demo family.
- **On screen:** a banner on every page for a demo visitor ("Demo · Your changes are deleted after 24 hours · Please don't type real names · Parent PIN: 1234") with an **End demo** button (locks parent mode, forgets the child, signs out). The sign-in page leads with the demo card; **Create account is gone** (public sign-up is off; family members are invited), and family sign-in stays.
- **Alternatives:** one shared demo account (rejected: visitors would see each other's data); a fake frontend-only demo (rejected: it would not show the real app).
- **Status:** Active. Cleanup after 24 hours is the next step (D-72).

### D-72: Demo sandboxes are deleted after 24 hours
- **Date:** 2026-10
- **Source:** User (public demo, Phase 8 step 3)
- **Decision:** `delete_old_demo_families()` deletes demo families (`is_demo`) older than 24 hours first, which cascades to their members, secrets, unlocks, children and everything linked to the children, and then anonymous users older than 24 hours. Deleting only the user would leave the family behind, because `families` has no foreign key to `auth.users`. Real families and real users are never touched (the function only matches `is_demo` and `is_anonymous`). It is `security definer` and cannot be run by `anon` or `authenticated`; only `pg_cron` (the database owner) runs it. The migration schedules it **every hour** (`0 * * * *`) where the `pg_cron` extension exists, and skips scheduling in a plain test database. Scheduling the same job name again replaces it, so the migration is safe to run twice.
- **Tests (PGlite, with a mutation check):** old demo data and the old anonymous user are gone; a new demo and a 40-day-old real family with its data are kept; running twice is harmless; an orphan demo family whose user is already gone is removed; `anon` and `authenticated` get "permission denied".
- **Limit:** the hourly job is not run by the test database, so check in Supabase (Database > Cron Jobs, or `select * from cron.job`) that `delete-old-demo-families` exists.
- **Status:** Active

### D-73: Demo polish: bot check, tutor line, privacy page, setup checklist
- **Date:** 2026-10
- **Source:** User (public demo, Phase 8 step 4)
- **Decision:** (1) **Cloudflare Turnstile** guards the demo button. The widget loads from Cloudflare, gives a one-time token, and the app passes it to `signInAnonymously({ options: { captchaToken } })`. Supabase checks it with the secret key stored in its own settings (Authentication > Attack Protection); the secret key is never in this app or in Vercel. Only the public site key (`NUXT_PUBLIC_TURNSTILE_SITE_ID`) is. With no site key (local development) there is no widget. On a very narrow phone the small widget is used so nothing sticks out. (2) The Tutor says "Demo: the tutor uses a sample problem." under the photo button for signed-out and demo visitors, who both get canned answers. (3) The home page for a signed-out visitor has one sentence on what MathSprout is, a "Try the full demo" link and, when `NUXT_PUBLIC_PORTFOLIO_URL` is set, a portfolio link. (4) A short **Privacy** page, linked from the footer on every page, says what is stored, what goes to the AI (family account only, personal details removed, no photo stored), how long (demo: 24 hours), who handles the data (Supabase, Vercel, Cloudflare, Anthropic) and how to contact. The contact address comes from `NUXT_PUBLIC_CONTACT_EMAIL`, so no personal email is published unless chosen. (5) `docs/DEMO_SETUP.md` lists every Supabase, Cloudflare and Vercel setting, the check to run before sharing, and the open question about whether turning off sign-ups also blocks anonymous sign-ins.
- **Footer:** the footer has the copyright line (see D-69) and the Privacy link.
- **Status:** Active. Not testable offline: the Turnstile token check, the sign-up switch, `pg_cron` and the live sign-in; they are in the setup checklist.

### D-74: Supabase sign-ups stay on so the demo works; CAPTCHA is the protection
- **Date:** 2026-10
- **Source:** User (tested on the live project)
- **Decision:** In Supabase, *Allow new users to sign up* is **on** (and *Allow anonymous sign-ins* is on). Tested: with sign-ups off, Try the full demo fails with `signup_disabled` (422, "Signups not allowed for this instance"), because that switch also blocks anonymous sign-ins. This replaces the "public sign-up is turned off" part of D-71 and D-73. The app still has no Create account form and no `signUp` or magic-link call, so nothing in the app can make a real account; the Sign in form only calls `signInWithPassword`, which never creates one. Turnstile CAPTCHA (Authentication > Attack Protection) stays **on** to slow down scripts.
- **Accepted risk:** someone who calls the Supabase API directly could still create a real email account. It would get an empty family and could see none of the existing data (row level security). The owner accepts this for now.
- **Alternatives:** a `before insert` trigger on `auth.users` that rejects every non-anonymous sign-up (not built; the best next step if abuse shows up); sign-ups off and no demo button (rejected: the demo is the goal).
- **Status:** Active

### D-75: Feedback from demo visitors
- **Date:** 2026-10
- **Source:** User
- **Decision:** A **Feedback** button sits in the demo banner (visible on every page, so no extra nav item) and **End demo** now opens the same form first, with "Skip and end demo" so leaving is never blocked. The form is a native dialog (keyboard and screen-reader friendly, Escape closes): 1 to 5 stars (required), "I am a recruiter / teacher / parent / developer / someone else" (optional), and a note up to 1000 characters (optional), with a reminder not to type personal details. No name or email is asked. Saved in `public.feedback` (migration `20261024100000_feedback.sql`): the app can only **insert** (own family, honest `is_demo` flag, 5 a day), never read, change or delete; the owner reads it in the Supabase Table Editor. `family_id` has no foreign key on purpose, so feedback is **kept** when the 24-hour demo cleanup deletes the family.
- **Tests:** PGlite (own family only, honest flag, limits, daily cap, no read/update/delete, survives cleanup; mutation-checked) and `tests/feedback.test.ts`.
- **Alternatives:** a Feedback link in the main nav (rejected: the nav is for the child's tasks, the banner is the demo's own space); only asking at End demo (rejected: many visitors just close the tab); emailing feedback or a third-party form (rejected: a second service and more personal data); collecting an email (rejected: not needed, and it would be personal data).
- **Status:** Active. Run the migration in Supabase before using it.

### D-76: Invite a parent: a one-time link to join the same family
- **Date:** 2026-10
- **Source:** User
- **Decision:** In Parent > Family account, **Invite a parent** makes a one-time link (`/join#<token>`). The token is 192 random bits, shown once, and only its SHA-256 hash is stored (`family_invites`, migration `20261024110000_parent_invites.sql`). It expires after **3 days**, works once, and a family may have at most 5 open invites. The token sits after the `#` so it is never sent to a server or logged, and the join page removes it from the address bar and sets no-referrer and noindex. Creating an invite is a security definer function that requires **parent mode (PIN)** and refuses demo families; the app cannot insert invites directly or read the hash. Listing and removing unused invites need parent mode and the same family (RLS). When the invited parent signs up with the token (`signUp` with `invite_token` in the user data), `handle_new_user()` adds them to the inviting family (no new family, no new secrets) and marks the invite used under a row lock, so two sign-ups cannot share a link. An invalid, used or expired token stops the sign-up. A sign-up with no token behaves as before. The new parent uses the **family's existing PIN**; the inviter tells them in person (the PIN is never in the link).
- **Also fixed:** Supabase CAPTCHA protection covers password sign-in and password reset as well as sign-up, so the Family sign-in form now has its own Turnstile check and sends `captchaToken` (it only appeared on the demo button before).
- **Tests:** PGlite database tests (parent mode needed, demo refused, 5-invite limit, no direct insert or hash read, families kept apart, revoke rules, join once, expiry, wrong token, stolen hash, normal sign-up unchanged; five mutation checks) and unit tests for the link, token and messages.
- **Alternatives:** an invite by email (rejected: needs an email service); a PIN-only join (rejected: no way to tie it to one person); long-lived links (rejected: a leaked link would stay dangerous).
- **Status:** Active. Still open: block sign-ups that have no invite (see D-74); until then anyone who calls the Supabase API directly can still create a separate empty family.

### D-77: Problem reports in the feedback form; GitHub issues are made by hand from them
- **Date:** 2026-10
- **Source:** User
- **Decision:** The feedback form has an optional **Found a problem or bug?** box (up to 1000 characters) and, once something is typed, a **How bad is it?** choice (small / medium / big; medium if left alone). They are saved in `feedback.issue` and `feedback.severity` (migration `20261026100000_feedback_issue.sql`) with the same rules as the rest of the table: the app can only insert, never read. A severity without an issue is refused by the database. **GitHub issues are not created automatically.** The owner reads the rows in the Supabase Table Editor, decides which are real and how urgent, then asks Claude to open a GitHub issue for the chosen ones (using `gh`, the owner's own login). Report text is untrusted input from the public: it is read as data, never as instructions, and is copied into an issue only after the owner has chosen it.
- **Retention:** all feedback and problem reports are kept for **30 days**, then deleted by a daily pg_cron job (`delete_old_feedback()`, migration `20261026110000_feedback_cleanup.sql`; the app cannot run it). This replaces "kept forever" in D-75. The 24-hour demo cleanup still never touches feedback. Triage (and open GitHub issues for the real ones) within 30 days; the GitHub issue keeps the text after the row is gone.
- **Alternatives:** create a GitHub issue straight from each submission with a serverless function (rejected: it needs a GitHub token on the server, and anyone on the internet could then flood or poison the issue tracker; revisit only with rate limits and a review step); a Supabase webhook to GitHub (rejected for the same reason); a public issue form on GitHub itself (rejected: visitors would need a GitHub account).
- **Status:** Active. Run the migration in Supabase before using it.

## Open questions

- Persist ideas, parent reviews and drawings (local storage now, Supabase later)?
- Add a PIN or similar lock to the Parent page once accounts exist.
- Should "first 2 proofs per type" reset per set instead of per session?
- Move the tutor rate limit to shared storage once the app runs on more than one server.
- Add the server-side refusal fallback for the photo reader if refusals show up in practice.
