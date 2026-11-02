# Checking the word-problem models locally

These pages cover the three Tutor problem types and (in later PRs) their Deep Check rules. You do not need an AI key or a signed-in account: a developer page loads sample problems with no AI.

## Set up (once)

```bash
git fetch origin
npm install
```

## Check out a PR's branch

The PRs are stacked, so each branch includes the one before it.

| Step | Branch | What it adds |
|---|---|---|
| 1 | `feature/tutor-fraction-bar-model` | Part of the rest (fraction bar) |
| 2 | `feature/tutor-unit-bar` | Work backwards (unit bar) |
| 3 | `feature/tutor-rate-day-strip` | Same amount each day (day strip, warm-up, preview page) |
| 4 | `feature/deepcheck-word-problem-models` | Three word-problem rules (R19 to R21) under Fraction multiplication and division in Deep Check: 15 quiz items, 6 Olympiad challenges, drawn bar models |

```bash
git checkout feature/tutor-rate-day-strip
npm run dev
```

The app opens on <http://localhost:3000> (or the next free port the terminal shows).

## Always run first

```bash
npm run typecheck
npm run test:run
```

Both must pass before you look at anything in the browser.

## The preview page (no AI)

Open <http://localhost:3000/dev/models>. It only exists while developing, and the production build removes it.

1. Pick one of the three types. Each uses an original story.
2. Tap **Next step** and **Previous step**. The picture shows what she has earned after that step. The answer to a step must never appear before that step.
3. Tap **Replay** to run the animation again.
4. Tap **Use this sample in the Tutor**, then open the Tutor, tap **Type it**, type anything and tap **Read it**. The real flow starts with the sample problem.

## What to check for each type

### Part of the rest (fraction bar)
- After step 1 the bar is cut into equal parts, the given part is coloured and the rest is outlined and named.
- After step 2 every part is cut again (new dashed lines appear), and the new fraction is coloured with a different colour.
- While working step 2 the first bar stays on screen under "What we found so far".

### Work backwards (unit bar)
- The whole shows as `…: ?` until the very last step.
- After the multiply step the bar is cut into units and the amount left is shown on its part.
- After the last step it says how many units the amount is, what one unit is worth, and the whole.

### Same amount each day (day strip)
- On step 2 ("how many days to use all of it") there is a **Try an easier one first (optional)** row.
  - Open it. Type a wrong number twice: **Show me** appears. Type the right number: the half-and-half picture appears.
  - It never has to be opened. The step can be answered without it.
- The strip grows after each step: used fraction, days for all of it, the day now, the days left, one day, all days.
- The whole amount is not shown before step 6.

## In every case

- The **Draw your own bar model (optional)** row works: cut the bar, colour parts, write a label for each colour.
- The answer boxes: choose **Whole number**, **Fraction** or **Mixed number**. `$500` is accepted in the whole number box.
- Check the widths 320, 375, 768, 1024 and 1280 (browser developer tools, device toolbar): no sideways scroll, nothing cut off, every button is easy to tap.
- Turn on "reduce motion" in your system settings: the pictures should appear finished, with no animation.

## What cannot be checked this way

The AI reading a real problem into one of these shapes needs a signed-in family account and the API key, and is not covered by the preview page. To try it, sign in as a parent, open the Tutor and type a problem of that type. The first runs may need small changes to the prompt in `server/utils/tutor/read.ts`.


## Deep Check: word-problem models (branch `feature/deepcheck-word-problem-models`)

Open <http://localhost:3000/deep-check> and open the **Fraction multiplication and division** topic. The three new rules come after the earlier ones.

1. **Topic row:** it now says "13 rules · 0 mastered" with a **Chapter quiz** button, and the **Olympiad challenges** row says "0 of 14 solved" (C1 to C8, then the new C9 to C14). There is no separate "Word-problem models" topic.
2. **Learn** on each rule (R19 Of the rest, R20 Work backwards from what is left, R21 The same amount each day):
   - The picture is built by code from a sample problem and matches the words under it.
   - R19 shows two pictures: the first cut and the second cut. R21 shows the day strip.
3. **Quiz me** on each rule: five questions (always/sometimes/never, spot the mistake, which one doesn't belong, reverse it, draw it).
   - **Draw it** uses the bar sketch tool: cut the parts, colour them, **Check my drawing**. For R19 it needs 12 parts with 9 in one colour and 1 in another (any colours). A wrong drawing says what to fix.
   - One hint per question, and it must never give the answer.
4. **Chapter quiz** for the topic: 10 questions drawn from all 13 rules of the topic, so a quiz may include the new ones.
5. **Olympiad challenges** (C9 to C14): try a wrong answer, then a right one. An equal form is accepted (6/40 for 3/20 is wrong only where the question asks for simplest form).
6. **Parent page:** after answering, the parent page shows the new rules' stars and the challenges solved.

Answers for the challenges (so you can check the app, not the other way round): C9 3/20 and 9/20, C10 1/4, C11 72, C12 50, C13 12, C14 9.

Also run the tests, which check every answer against the fraction engine:

```bash
npm run test:run -- tests/deep-check.test.ts
```
