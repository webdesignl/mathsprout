# DinnerPilot – Product & Build Plan

Oct 23, 2026 · Planning only. Nothing is built yet.

> **Stack update (Oct 26, 2026, D-10):** the app is built with **React and Next.js**, not Nuxt. Wherever this plan says Nuxt, Vue, Pinia, `server/api` or `useSupabaseClient`, read Next.js, React, TanStack Query, `app/api` route handlers and `@supabase/ssr`. The day-by-day schedule is in `docs/DAY_BY_DAY_PLAN.md`.

DinnerPilot is an AI agent that plans the week's dinners for the whole family. It plans around what is already in the fridge and a weekly budget, respects everyone's allergies and diets, shows each step it takes ("Checking pantry", "Checking nut allergy"), waits for your approval before saving the plan, and builds the grocery list for the week.

It is also a learning project: each phase teaches one AI skill (tool use, agent loops, RAG, MCP). See `docs/LEARNING_PLAN.md` for the matching courses.

## Core idea: code decides what is safe; AI proposes

The same golden rule as MathSprout, applied to food.

- **The AI proposes** meals, swaps and wording.
- **Code decides** whether a meal is allowed (allergies, diets), whether it fits the budget, and whether the pantry covers it.
- **The human approves** before anything is saved.

If the AI suggests a peanut dish for a family with a nut allergy, the code rejects it and the agent must try again. The AI cannot override this, and its opinion about allergies is never used.

## Goals and non-goals

**Goals**

- Plan 5 to 7 dinners for a week in under a minute.
- Never propose a meal that breaks an allergy or diet rule (enforced by code, tested).
- Stay within a weekly budget, using pantry items first.
- Show every step the agent takes, live, in plain language.
- Save nothing until the user approves; produce a grocery list from the approved plan.
- Teach the builder RAG, tool use, agent loops and MCP with a real, working app.
- Be cheap to run: Haiku-class model by default, per-user limits, a hard monthly spend cap.

**Non-goals (for now)**

- No medical or nutrition advice. Allergy rules are a safety filter, not a diagnosis. The app says so.
- No real grocery ordering, payments or store integrations.
- No barcode scanning or photo recognition in v1.
- No social features, no public recipe sharing.
- No native mobile app (responsive web only).
- No copying recipes from websites or books. Seed recipes are original.

## Users and key flows

Users are members of one **household**. Roles: **owner** (can approve and save plans, edit members and allergies) and **member** (can view, edit pantry, suggest). Only fictional sample data is used in demos and tests.

| Flow | What happens |
|---|---|
| **Set up household** | Add people with a nickname, allergies and diets (e.g. "no peanuts", "vegetarian"), the weekly budget, and dinners per week. |
| **Update pantry** | Add or remove items with quantity and optional expiry date. |
| **Plan the week** | Owner presses Plan. The agent runs; the screen shows each step as it happens. |
| **Review and approve** | The proposed plan appears as a draft with cost, pantry use and any warnings. Owner can swap a meal (agent re-checks it), then Approve or Discard. |
| **Grocery list** | After approval, the list is built (needed minus pantry), grouped by aisle, with an estimated total. Tick items off at the store. |
| **Demo visitor** | A sandbox household with fictional people. AI replies come from recorded canned runs, so a stranger never spends money. |

## Safety rules (non-negotiable)

1. **Allergies and diets are enforced by code.** `app/utils/safety.ts` (shared with the server) checks every proposed meal against every member's rules using structured ingredient tags, not AI judgment. The agent's `save_plan` tool refuses any plan the code has not cleared.
2. **Fail closed.** If an ingredient has no allergen tags, it counts as unknown and is blocked until reviewed.
3. **Human approval before saving.** The agent can only create a *draft*. A plan becomes saved only through an owner action that the database allows (see RLS below). Hiding the button is not the protection.
4. **Minimal data to the AI.** Send only what is needed: ingredient names, allergen tags, diet labels, budget, pantry items. Never real names (use "Person A" / member tokens), emails, addresses or locations. Never send auth tokens.
5. **Claude API on the server only.** The key lives in server env vars, never in `NUXT_PUBLIC_*` and never in `app/` code.
6. **Row level security everywhere.** Every household table has `household_id` and RLS. The app uses only the Supabase publishable key. No service-role key in the app.
7. **Limits.** Per-user rate limit, maximum agent steps per run, maximum tokens per run, and a monthly spend cap on the Anthropic account.
8. **Prompt-injection care.** Recipe text and pantry names are data, not instructions. Tool results are length-limited and wrapped as data. Tools can only do what code allows, so a poisoned recipe cannot save a plan or reach another household.
9. **Never store or log secrets.** Logs contain step names and ids, not full prompts with household details.

## Architecture

| Layer | Choice | Why |
|---|---|---|
| App | Nuxt 4 (`app/`), Vue 3 `<script setup>`, TypeScript strict, Tailwind | Your strongest stack |
| State | Pinia (stores: household, pantry, plan, agentRun, grocery) | Same as MathSprout |
| Auth and data | Supabase Auth + Postgres with RLS, migrations in `supabase/migrations/` | Database enforces security |
| AI | Claude API from Nuxt server routes (`server/api/*`) only, tool use, Haiku-class model by default | Key never reaches the browser; cheap |
| Agent | A loop in `server/utils/agent/` that calls the model, runs tools in code, streams steps | The core learning goal |
| Streaming | Server-Sent Events from `/api/plan/stream`; the UI renders a step timeline | Visible steps |
| RAG | Postgres `pgvector` in Supabase; embeddings of the household's recipes and notes | Learn RAG without a new service |
| MCP (optional) | A small MCP server exposing `pantry_list`, `recipe_search`, `plan_get` read tools | Learn MCP; usable from Claude Desktop |
| Tests | Vitest; AI mocked; fixtures for agent evals; PGlite for database/RLS tests | Reliable and free to run |
| Hosting | Vercel + Supabase, as MathSprout | Known path |

### Request path

1. Browser calls `POST /api/plan` with a household id. The server verifies the user and role from the Supabase token.
2. The server loads the household facts it needs, builds an **AI-safe context** (tokens instead of names), and starts the agent loop.
3. Each model turn may request tools. Code runs the tool, validates its output, and emits a step event over SSE.
4. When the model returns a final plan, code re-runs safety and budget checks. If it fails, the agent gets the failure as a tool result and tries again (up to a limit).
5. A passing plan is stored as `draft`. The UI shows it. The owner presses Approve, which calls a database function that flips `draft` to `saved` only for an owner.

## Data model

All tables have `household_id` and RLS. Draft types below are the TypeScript shapes; the SQL goes in migrations.

```
households(id, name, weekly_budget_cents, dinners_per_week, created_at)
household_members(household_id, user_id, role 'owner'|'member')            -- auth link
people(id, household_id, nickname, diets text[], created_at)                -- the people who eat
person_allergies(person_id, household_id, allergen text, severity)          -- composite FK (person_id, household_id)
ingredients(id, household_id null, name, allergen_tags text[], diet_tags text[], aisle, unit, est_cents_per_unit)
recipes(id, household_id, title, minutes, servings, steps text, source 'seed'|'user'|'ai', embedding vector(1024))
recipe_ingredients(recipe_id, household_id, ingredient_id, quantity, unit)
pantry_items(id, household_id, ingredient_id, quantity, unit, expires_on)
plans(id, household_id, week_start, status 'draft'|'saved'|'discarded', total_cents, created_by, approved_by, approved_at)
plan_meals(plan_id, household_id, day, recipe_id, servings)
grocery_items(id, plan_id, household_id, ingredient_id, quantity, unit, est_cents, checked)
agent_runs(id, household_id, plan_id, status, steps jsonb, tokens_in, tokens_out, created_at)   -- step names only, no personal data
```

Rules:

- Anything about a person uses a **composite foreign key** `(person_id, household_id)` so rows cannot cross households.
- `ingredients.household_id` is null for shared seed ingredients (read-only to everyone).
- Saving a plan: only `approve_plan(plan_id)` (security definer) may set `status = 'saved'`, and only for an owner. Direct updates of `status` are blocked by RLS and a trigger.
- Amounts are integers (cents, grams, millilitres). No floating point money.

## Agent design

The agent is a loop, not a prompt. Each tool is plain code; the model only chooses which to call.

| Tool | Does (in code) | Notes |
|---|---|---|
| `get_household_summary` | Returns budget, number of dinners, diet labels, allergen list as tags | Tokens not names |
| `check_pantry` | Pantry items, with what expires soonest | Step shown: "Checking pantry" |
| `search_recipes` | RAG: top-k recipes by meaning, filtered by code to safe ones | Step: "Looking through your recipes" |
| `check_allergies` | Runs `safety.ts` on a recipe id for the whole household; returns pass/fail and the reason | Step: "Checking nut allergy" |
| `price_estimate` | Sums ingredient costs minus what the pantry covers | Step: "Estimating cost" |
| `propose_plan` | Validates a full week (count, variety, budget, safety); stores a **draft** | Fails with reasons the model must fix |
| `build_grocery_list` | Computes needed minus pantry for a draft | Code only |

There is deliberately **no model-callable save**. Saving is a human action. (Course "save_plan" in tutorials maps to `propose_plan` + human `approve_plan`.)

**Loop rules**

- Maximum 12 model turns and a token budget per run; stop with a clear message if exceeded.
- Every tool result is validated with a schema (Zod) before it goes back to the model.
- Failed safety checks are returned as errors like `{ok:false, reason:"contains peanut; Person A is allergic"}` so the model can repair.
- Each tool call becomes a step event: `{id, label, status: 'running'|'done'|'failed', detail}`. Labels are written in code, not by the model, so they are always accurate.
- Hard timeout, and cancel button in the UI.

**Streaming to the UI.** The server writes SSE events (`step`, `draft`, `error`, `done`). A Pinia `agentRun` store builds the timeline. The timeline is an accessible list (`aria-live="polite"`), works on a 320px phone, and does not rely on hover.

## RAG design

Goal: the agent finds recipes that fit what the family actually likes and has, instead of inventing everything.

1. **Content:** the household's recipes (seed set of about 40 original recipes plus user-added ones) and optional notes ("kids like noodles", "no spicy").
2. **Chunking:** one chunk per recipe (title, short description, ingredient names, time). Small enough to need no splitting.
3. **Embeddings:** generated on the server when a recipe is saved; stored in `recipes.embedding` with `pgvector`. Pick one embedding model and record its name and dimension in `docs/DECISIONS.md`. The Anthropic API has no embeddings endpoint, so this needs a separate embeddings provider or Supabase's built-in embedding option (decide in Phase 5).
4. **Retrieval:** a SQL function `match_recipes(household_id, query_embedding, k)` with RLS. Hybrid later: add keyword search with Postgres full-text.
5. **Filter by code after retrieval:** retrieval proposes, `safety.ts` disposes. RAG never decides safety.
6. **Evaluate:** a small fixed set of queries with expected recipes ("quick vegetarian dinner using lentils") checks recall@5 before and after changes.

## MCP design (optional, Phase 8)

A small MCP server (TypeScript SDK) that exposes **read-only** tools: `pantry_list`, `recipe_search`, `plan_get`. It lets Claude Desktop or Claude Code answer "what can I cook tonight?" from your data.

- Auth: runs locally with a scoped Supabase user token; never the service-role key.
- No write tools in v1. Saving stays a human approval in the app.
- The app's own agent can call the same tool functions directly; MCP is an extra door, not the core.

## Testing strategy

| What | How |
|---|---|
| `safety.ts` (allergens, diets, unknown ingredients) | Vitest table tests: every allergen and diet, cross-contact tags, missing tags blocked |
| Budget and pantry math | Vitest, integer cents; edge cases (pantry covers all, zero budget) |
| Agent loop | Mocked model client returning scripted tool calls; assert tool order, step events, max-turn stop, retry after safety failure |
| Agent evals | Fixed fixtures: 3 fictional households, scripted or recorded model outputs, assert invariants (no allergen, within budget, correct count). Run live against the real model only by hand, never in CI |
| Database and RLS | PGlite tests like MathSprout: member of household A cannot read or write household B; member cannot approve; only owner can |
| API routes | Unauthenticated, wrong household, over-limit all rejected; demo mode makes zero AI calls |
| RAG | Embedding function mocked; retrieval ordering tested with fixed vectors; recall check on fixtures |
| UI | Component tests for the step timeline and approval screen; manual check at 320, 375, 768, 1024, 1280px |

CI rule: `npm run test:run` and `npm run typecheck` must pass, with no network calls.

## Build phases

Each phase is one small branch and PR. Phases 1 to 3 need no AI and cost nothing to run. Branch names follow `feature-NNNN/short-name`, as in MathSprout.

| # | Phase | Goal | Tasks | Done when | Branch |
|---|---|---|---|---|---|
| 1 | Foundation | Empty app that builds, tests and deploys | Scaffold Nuxt 4, TS strict, Tailwind, Pinia, Vitest; CLAUDE.md rules; CI; mobile-first shell | `npm run test:run` and `typecheck` pass; deployed page loads | `feature-0001/scaffold` |
| 2 | Safety and money engine | The rules that must never fail | `safety.ts`, `budget.ts`, `pantry.ts` with types; seed ingredient tags; exhaustive tests | Every allergen/diet/budget case tested and green | `feature-0002/safety-engine` |
| 3 | Households, auth, RLS | Real accounts and private data | Supabase Auth; migrations for households, people, allergies, pantry; RLS; PGlite tests; setup and pantry screens | Household B cannot see household A (tested); owner can add people and pantry | `feature-0003/households-rls` |
| 4 | Agent v1 (tool use) | Agent plans one week using tools | Claude client on server; tools `get_household_summary`, `check_pantry`, `check_allergies`, `price_estimate`, `propose_plan`; agent loop with limits; mocked tests | Mock-model tests pass; one live run produces a draft that passes safety | `feature-0004/agent-loop` |
| 5 | Visible steps | Watch the agent work | SSE endpoint; `agentRun` store; step timeline UI; cancel; labels from code | Steps appear live on a phone; screen reader announces them | `feature-0005/step-stream` |
| 6 | Approval and grocery list | Human in control | Draft review screen; swap a meal (re-checked); `approve_plan` function with RLS; `build_grocery_list`; grocery UI | Non-owner cannot approve (tested); approving creates a list | `feature-0006/approve-and-groceries` |
| 7 | RAG over recipes | Smarter, personal picks | Seed 40 original recipes; pgvector migration; embeddings job; `match_recipes`; `search_recipes` tool; recall fixtures | Recall@5 meets the target set in fixtures; unsafe hits still blocked | `feature-0007/recipe-rag` |
| 8 | Evals and hardening | Trust the agent | Eval fixtures and invariant runner; rate limits; token and step caps; prompt-injection test cases; spend cap documented | Evals pass; injection fixtures cannot save or leak | `feature-0008/agent-evals` |
| 9 | MCP server (optional) | Your data from Claude Desktop | TypeScript MCP server with 3 read-only tools; local setup docs | Claude Desktop lists and calls the tools on fictional data | `feature-0009/mcp-server` |
| 10 | Public demo | Safe link for LinkedIn | Anonymous sandbox household (fictional), canned agent run, Turnstile, 24-hour cleanup, README with demo video | A stranger can run a plan with zero AI cost; old sandboxes are deleted | `feature-0010/public-demo` |

Rough effort: Phases 1–3 about 3 weekends; 4–6 about 3 weekends; 7–8 about 2 weekends; 9–10 about 2 weekends.

### Which phase teaches which skill

| Build phase | You learn (see LEARNING_PLAN.md) |
|---|---|
| 1–3 | Nothing AI yet; read LLM fundamentals and prompting |
| 4 | Tool use / function calling; the Claude API; agent loop basics |
| 5 | Streaming; agent design patterns (reflection, tool use, planning) |
| 6 | Human-in-the-loop; guardrails |
| 7 | RAG: embeddings, vector search, chunking, evaluation |
| 8 | Agent evals; prompt injection |
| 9 | MCP: servers, tools, resources, clients |
| 10 | Production concerns: cost, limits, caching |

## Claude Code prompts

**Phase 1:**

```
Read CLAUDE.md and docs/DINNERPILOT_PLAN.md (Phase 1). Scaffold a Nuxt 4 app (app/ directory) with TypeScript strict, Tailwind, Pinia and Vitest. Add scripts dev, test, test:run (with coverage) and typecheck. Build a mobile-first layout shell with a header and bottom navigation (44px tap targets, aria labels) following the responsive-tailwind skill. Add one smoke test. Run npm run test:run and npm run typecheck and fix anything failing. Add a DECISIONS.md entry for any choice you make.
```

**Phase 2:**

```
Read CLAUDE.md and docs/DINNERPILOT_PLAN.md (Safety rules, Phase 2). Create app/utils/safety.ts: given a household's people (allergies, diets) and a recipe's ingredients with allergen_tags and diet_tags, return { ok, reasons[] }. Missing tags mean unknown and must block. Add budget.ts (integer cents) and pantry.ts (needed minus pantry). Write exhaustive Vitest tests in tests/ for every allergen, diet, unknown ingredient, cross-contact tag, zero budget and pantry-covers-all. Use fictional people only. Run npm run test:run and npm run typecheck and fix anything failing.
```

## Open questions

- Which embeddings provider (the Claude API has none)? Decide in Phase 7, record in DECISIONS.md.
- Allergen list: start with the common major allergens (peanut, tree nut, milk, egg, wheat, soy, fish, shellfish, sesame) and add more later.
- Prices: start with a hand-made ingredient price table per household; no live store prices.
- Should members be able to propose plans, or only owners? Starting with owners only.
