# DinnerPilot: Day-by-Day Plan (React edition)

Starts Monday, Oct 26, 2026 · 8 weeks · ends Sunday, Dec 20, 2026

**Goal:** a finished, live **React** project you can show employers, built with AI help, while you learn JavaScript, React and AI (tool use, agents, RAG, MCP).

## Stack change: React, not Nuxt

This replaces the Nuxt parts of `DINNERPILOT_PLAN.md` (the product idea, safety rules, data model, agent design, RAG and MCP stay the same).

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js (App Router) with React 19 and TypeScript strict** | It is React, and it also gives you server routes for the AI key and streaming, deployed on Vercel |
| Styling | Tailwind CSS, mobile-first, 44px tap targets | Same rules as MathSprout |
| State | React state and `useReducer` first; **TanStack Query** for server data; Zustand only if needed | Learn core React before libraries (Pinia becomes these) |
| Auth and data | Supabase Auth + Postgres with RLS, `@supabase/ssr` | Database enforces security |
| AI | Anthropic SDK in Next.js route handlers only (`app/api/...`) | Key never reaches the browser |
| Streaming | Server-Sent Events from a route handler, read in React with `fetch` and a reducer | Visible agent steps |
| RAG | pgvector in Supabase | One database |
| MCP (optional) | TypeScript MCP server, read-only | Learn MCP |
| Tests | Vitest + React Testing Library; AI mocked; PGlite for RLS tests; Playwright for one end-to-end run | Reliable and free to run |

Why Next.js and not plain Vite + React? The agent needs a server to hold the Claude key and stream steps. Next.js gives you that in one React project. Everything in the browser is still plain React you can explain in an interview.

## Daily rhythm

| When | Time | What |
|---|---|---|
| Mon to Fri | about 3 h | **Learn 45 to 60 min** (course or docs) → **Build 1.5 to 2 h** (one small task, one commit) → **Job search 30 min** if you are applying that day (apply, one LinkedIn message, one comment on a post) |
| Saturday | about 5 h | Long build session and the phase's PR |
| Sunday | about 2 h | Review, tests, write the week's notes, plan next week. Rest the rest of the day |

If you have fewer hours, keep the order and stretch each week to ten days. Do not skip the tests.

## How to use AI while building (so you can explain every line)

1. **You write the plan for the day** in one sentence before you open Claude Code.
2. **Tests first for rules** (safety, budget, pantry): you write the cases in plain words, the AI writes the code, you read the diff.
3. **Read every diff.** If you cannot explain a file, ask the AI to explain it, then write a 2-line comment in your own words.
4. **Never let the AI decide safety.** Allergies and budget are code with tests.
5. **End each day** with one line in `docs/LEARNING_LOG.md`: what you built, what you learned, one thing you still do not understand.
6. **Interview check, Sunday:** pick one file at random and explain it out loud for two minutes.

## Learning resources (free first)

| Topic | Resource | Cost |
|---|---|---|
| Modern JavaScript | javascript.info (The Modern JavaScript Tutorial) | Free |
| React | react.dev "Learn React" (official) | Free |
| TypeScript | typescriptlang.org handbook | Free |
| Next.js | nextjs.org/learn | Free |
| LLMs, tool use, RAG, MCP | The courses in `LEARNING_PLAN.md` (Anthropic Academy, DeepLearning.AI, Coursera) | Free to low cost |

---

## Week 1 (Oct 26 to Nov 1): JavaScript, React basics, project foundation (5 hours of learning a day)
**Build phase 1: Foundation.** Done when: Next.js app builds, tests pass, deployed to Vercel.

This week is heavier on learning: about **5 hours of learning plus 1 hour of building** each weekday (job search is extra, 30 minutes on the days you apply). Take a 10-minute break every hour and do the exercises yourself before looking at answers. From Week 2 the normal rhythm resumes.

| Day | Learning (about 5 h) | Build (about 1 h) |
|---|---|---|
| Mon | **JavaScript.** javascript.info: variables, types, functions, arrow functions (1.5 h) · objects (1 h) · array methods: map, filter, reduce, find (1.5 h) · write 10 small exercises in a scratch file (1 h) | Create the GitHub repo and the Next.js app (TypeScript strict, Tailwind). Commit |
| Tue | **JavaScript.** Closures and scope (1 h) · modules (0.5 h) · promises (1.5 h) · async/await and `fetch` (1 h) · exercise: fetch a public JSON API and print a filtered list (1 h) | Add Vitest + React Testing Library, one smoke test, and `test:run` and `typecheck` scripts |
| Wed | **React.** react.dev Quick Start and Describing the UI: components, props, conditional rendering, lists and keys (2.5 h) · exercises: build a recipe card and a list of cards (1.5 h) · start the tic-tac-toe tutorial (1 h) | CI on GitHub Actions; deploy to Vercel |
| Thu | **React.** Adding Interactivity: state, events, updating objects and arrays (2 h) · finish tic-tac-toe (1.5 h) · Thinking in React (1 h) · refactor your recipe list to use state (0.5 h) | Mobile-first layout shell: header, bottom navigation, 44px tap targets, aria labels |
| Fri | **React and TypeScript.** Managing State: reducers and context (2 h) · Escape Hatches: effects, refs, when not to use effects (2 h) · TypeScript basics and typing React props (1 h) | Build a `PantryItem` component with state; test it with React Testing Library |
| Sat | **AI and TypeScript.** Generative AI with LLMs, week 1: how LLMs work, tokens (3 h) · TypeScript handbook: interfaces, unions, generics intro (1.5 h) · write the week's notes (0.5 h) | Finish the phase 1 PR; write `CLAUDE.md` and first decisions; merge |
| Sun | Light day: re-do one exercise from memory (1 h) | Plan Week 2. Interview check: explain `useState` and `map` with your own examples |

**Checkpoint, end of Week 1:** you can build a small React page with lists, state and a form without copying, you can explain async/await, and the empty app is live on Vercel.

**If 5 hours a day is too much,** keep Mon to Wed as written and spread Thu and Fri over three days; the plan stays valid because Week 2 starts with types, not new React topics.

## Week 2 (Nov 2 to Nov 8): TypeScript and the safety engine
**Build phase 2: Safety and money engine** (pure TypeScript, no React). Done when: every allergen, diet and budget case is tested and green.

| Day | Learn | Build |
|---|---|---|
| Mon | TypeScript handbook: types, interfaces, unions | Define types: `Person`, `Allergy`, `Ingredient`, `Recipe`, `Pantry` |
| Tue | TypeScript: generics, narrowing, `readonly` | Write the test cases (plain words → tests) for `safety.ts`; unknown tags must block |
| Wed | react.dev: Managing State (reducers, context) | Implement `safety.ts` until the tests pass |
| Thu | Gen AI with LLMs, week 2 (prompting, context windows) | `budget.ts` in integer cents, with tests |
| Fri | react.dev: Escape Hatches (effects, refs, when not to use effects) | `pantry.ts` (needed minus pantry), with tests |
| Sat | Anthropic prompting guide (docs) | Seed ingredient tags (fictional data); tests for all 9 major allergens; PR and merge |
| Sun | Review | Notes, interview check |

## Week 3 (Nov 9 to Nov 15): Accounts, database and RLS
**Build phase 3: Households, auth, RLS.** Done when: household B cannot read household A (tested).

| Day | Learn | Build |
|---|---|---|
| Mon | Building with the Claude API: setup and first request | Supabase project; migrations for `households`, `members`, `people`, `allergies` |
| Tue | SQL refresher: joins, constraints; Supabase RLS docs | RLS policies + helper function `my_household_id()` |
| Wed | Next.js Learn: routing, layouts, server vs client components | PGlite tests for RLS (A cannot see B) with a mutation check |
| Thu | react.dev: forms and controlled inputs; React Hook Form (optional) | Sign-in and sign-up pages with `@supabase/ssr` |
| Fri | Building with the Claude API: system prompts, parameters | Household setup screen: add people and allergies |
| Sat | TanStack Query docs: queries and mutations | Pantry migration, RLS, and the pantry screen; PR and merge |
| Sun | Review | Notes, interview check |

## Week 4 (Nov 16 to Nov 22): Agent v1 (tool use)
**Build phase 4.** Done when: mocked tests pass and one live run gives a draft that passes safety.

| Day | Learn | Build |
|---|---|---|
| Mon | Building with the Claude API: tool use (definitions, results) | Claude client in a route handler; env var for the key (server only) |
| Tue | Tool use: multiple tools and loops | Tools: `get_household_summary`, `check_pantry` |
| Wed | Anthropic docs: handling errors, limits, retries | Tools: `check_allergies` (calls your `safety.ts`), `price_estimate` |
| Thu | DeepLearning.AI Agentic AI: tool-use pattern | `propose_plan` tool and the agent loop with max turns and token limits |
| Fri | Agentic AI: reflection and retry | If the plan fails safety, send the failure back and retry (limited) |
| Sat | Review prompts and token use | Mock-model tests for the loop; one live run; PR and merge |
| Sun | Review | Notes, interview check |

## Week 5 (Nov 23 to Nov 29): Visible steps, approval, groceries
**Build phases 5 and 6.** Done when: steps appear live on a phone, and only an owner can approve.

| Day | Learn | Build |
|---|---|---|
| Mon | MDN: Server-Sent Events and `ReadableStream` | SSE route handler that emits step events from the loop |
| Tue | react.dev: `useReducer` patterns | `useAgentRun` hook: `fetch` stream → reducer → step list |
| Wed | Accessibility: `aria-live` regions | Step timeline UI ("Checking pantry", "Checking nut allergy"), announced to screen readers; cancel button |
| Thu | Agentic AI: planning and human-in-the-loop | Draft review screen; swap one meal (re-checked by code) |
| Fri | Postgres security definer functions | `approve_plan` function (owner only) with RLS tests |
| Sat | Review | `build_grocery_list` and the grocery screen; PR and merge |
| Sun | Review | Notes, interview check |

## Week 6 (Nov 30 to Dec 6): RAG over recipes
**Build phase 7.** Done when: recall fixtures meet the target and unsafe hits are still blocked.

| Day | Learn | Build |
|---|---|---|
| Mon | RAG course: embeddings and vector search | pgvector migration and `recipes` table |
| Tue | RAG: chunking, metadata | Write 40 **original** recipes (fictional); seed script |
| Wed | Vector Databases short course | Choose an embeddings provider (record it in `DECISIONS.md`); embeddings job |
| Thu | Retrieval with the Claude API (course section) | `match_recipes` SQL function with RLS |
| Fri | RAG: evaluation (recall@k) | `search_recipes` tool; recall fixtures |
| Sat | Review | Tests: unsafe recipes returned by search are still blocked by `safety.ts`; PR and merge |
| Sun | Review | Notes, interview check |

## Week 7 (Dec 7 to Dec 13): Evals, hardening, public demo
**Build phases 8 and 10.** Done when: evals pass and a stranger can run a demo plan at zero AI cost.

| Day | Learn | Build |
|---|---|---|
| Mon | Agentic AI: evaluation and error analysis | Eval fixtures: families with allergies and budgets; invariant runner |
| Tue | Prompt injection basics (Anthropic docs, OWASP LLM Top 10) | Injection fixtures (poisoned recipe text) that must not save or leak |
| Wed | Rate limiting patterns | Per-user rate limit, step and token caps; spend cap noted in docs |
| Thu | Cloudflare Turnstile docs | Demo sandbox household (fictional) and canned agent run; Turnstile |
| Fri | Supabase `pg_cron` | 24-hour cleanup; demo banner and Feedback button (reuse the MathSprout pattern) |
| Sat | Playwright basics | One end-to-end test: demo → run plan → approve → grocery list; PR and merge |
| Sun | Review | Notes, interview check |

## Week 8 (Dec 14 to Dec 20): MCP and portfolio polish
**Build phase 9 (optional) and showcase.** Done when: the README, demo video and LinkedIn post are ready.

| Day | Learn | Build |
|---|---|---|
| Mon | Introduction to MCP (Anthropic) | MCP server skeleton (TypeScript); `pantry_list` tool |
| Tue | MCP: tools and resources | `recipe_search` and `plan_get` (read-only, fictional data) |
| Wed | DeepLearning.AI MCP short course | Connect it to Claude Desktop; screenshot |
| Thu | Review | README: what it is, architecture diagram, how to run, safety rules, tests |
| Fri | Review | Record a 60 to 90 second demo video; update your portfolio card (replace "Coming soon") |
| Sat | Review | Final accessibility and responsive check (320, 375, 768, 1024, 1280px); fix; merge |
| Sun | Review | Write the LinkedIn post; interview check on the whole project |

---

## Weekly checkpoints

- **End of Week 1:** you can explain `useState` and `map` with your own example.
- **End of Week 3:** you can explain RLS and why the app never uses the service key.
- **End of Week 4:** you can explain a tool-use loop on a whiteboard.
- **End of Week 6:** you can explain embeddings and why recall is measured.
- **End of Week 8:** you can demo the project and answer "why does code, not the AI, check allergies?"

## What you will be able to say in interviews

- Built an AI agent in React/Next.js and TypeScript with tool use, streaming steps, and human approval.
- Enforced safety in code with tests, and the data layer with row level security.
- Added RAG with pgvector, and evals including prompt-injection cases.
- Shipped a public demo with bot protection, cost limits and automatic cleanup.

## If you fall behind

Cut in this order: MCP (Week 8), Playwright test, React Hook Form, Zustand, then the RAG recall target. Never cut the safety engine, the RLS tests or the approval step.
