# From a visitor's problem report to a fix PR

Three stages. A person stays in charge: you choose what is worth doing, and you read and approve every PR.

```
visitor -> Supabase `feedback` (private, write-only, kept 30 days)
        -> Stage 2: screen (plain code) -> Stage 1: triage skill -> GitHub issue (labels)
        -> Stage 3: label `ready-to-fix` -> fix agent -> PR "Fixes #n" -> you review and merge
```

## Stage 1: triage by hand
Ask Claude Code: **"triage feedback"** (skill `.claude/skills/triage-feedback/SKILL.md`). It reads new problem reports, checks them against `docs/DECISIONS.md`, the code and the live demo, and opens GitHub issues with labels: `severity: high|medium|low`, a type (`bug`, `usability`, `mobile`, `accessibility`, `enhancement`), `needs-triage` or `confirmed`, and `from-demo-feedback`. Issues are written in the agent's own words, with no personal details (the repo is public).

## Stage 2: screening before the agent reads anything
`scripts/screen-feedback.ts` (logic in `app/utils/feedbackTriage.ts`, tests in `tests/feedback-triage.test.ts`) is plain code, no AI and no cost. It drops too-short, non-text, repeated and link-spam reports, **drops any report that tries to give the agent orders** (you see only its id), hides emails, phone numbers and links, and merges near-duplicates. This is what cuts the agent's cost and the risk from public text.

Running it on a schedule is optional and not switched on. Until it is, you start it by asking for "triage feedback".

## Stage 3: automatic fix PR
Workflow `.github/workflows/fix-issue.yml`. It starts only when someone with write access adds the label **`ready-to-fix`** (the public cannot add labels). The triage agent adds it only for confirmed, high-severity, small and safe problems; you can add it yourself to any issue.

What it does: checks the daily limit (3 automatic PRs), lets the agent change code on a `claude/issue-N-…` branch with a short list of allowed tools, refuses a change that touches `.github/`, `.claude/`, `supabase/`, `package*.json` or `.env*`, runs `npm run test:run` and `npm run typecheck`, and only then opens a PR that says `Fixes #N`. It never merges. If the agent is unsure, or the checks fail, it comments on the issue instead.

### One-time setup (only you can do this)
1. GitHub repo > Settings > Secrets and variables > Actions > **New repository secret**: `ANTHROPIC_API_KEY`. Use a key from a separate Anthropic workspace with a **monthly spend limit**, so a runaway cannot cost much.
2. Settings > Actions > General > Workflow permissions: tick **Allow GitHub Actions to create and approve pull requests** (leave "Read repository contents" as the default).
3. Settings > Branches > rule for `main`: **Require a pull request before merging** (1 approval) and **Require review from Code Owners** (see `.github/CODEOWNERS`).
4. First run: make a harmless test issue (for example "Typo on the About page") and add `ready-to-fix`. Watch the Actions tab and read the PR.

### Known limits
- A PR opened with the workflow's own token does **not** start the normal CI run (a GitHub rule), so the workflow runs the tests itself first; CI runs again once the PR is merged to `main`.
- The workflow was written from the action's documentation and has **not run yet**. Expect to adjust it after the first test run.
- Report text is untrusted. The defences are layered: screening, issues written by the triage agent, label-gated start, a short tool list, blocked file paths, tests, and your review. None of them alone is enough.
