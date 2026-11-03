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

### Spacing (marks and gaps on a number line)

Pick "Things in a row (number line)" on `/dev/models`, step through, then "Use this sample in the Tutor".
- The understand screen lists "What is given" and a number line with the known lanterns and a dashed "?" end.
- No answer appears early: the 19th lantern is only drawn after the last step is answered.
- Wrong answers to step 1 of 4 ("4") and the last step ("17" or "18") each show a nudge about the picture, never the answer.
- "Rough work" opens with a number line behind the pad; "Number line" switches it off.
- Also try the gap question: 5 posts, 5 1/4 feet total, so 4 gaps and 1 5/16 feet.
- Also try the distance question in the Tutor by typing a reply through the AI or a test: 12 marks, gap 2 1/2 m, so 11 gaps and 27 1/2 m.
- There is no bar model on these screens. Check at 375px: words stay readable and the page does not scroll sideways.

## In every case

- The **Draw your own bar model (optional)** row works: cut the bar, colour parts, write a label for each colour.
- The answer boxes: choose **Whole number**, **Fraction** or **Mixed number**. `$500` is accepted in the whole number box.
- Check the widths 320, 375, 768, 1024 and 1280 (browser developer tools, device toolbar): no sideways scroll, nothing cut off, every button is easy to tap.
- Turn on "reduce motion" in your system settings: the pictures should appear finished, with no animation.

## What cannot be checked this way

The AI reading a real problem into one of these shapes needs a signed-in family account and the API key, and is not covered by the preview page. To try it, sign in as a parent, open the Tutor and type a problem of that type. The first runs may need small changes to the prompt in `server/utils/tutor/read.ts`.
