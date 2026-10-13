MathSprout
AI-assisted math practice app for a 4th grader doing Singapore Math Grade 5 (extended) and Math Olympiad prep.

Stack
Nuxt 4 (app/ directory), Vue 3 Composition API with <script setup>, TypeScript (strict), Pinia, Vitest. Supabase and the Claude API come later.

Golden rules
Code decides if math is right. AI never grades answers; it only asks hint questions and explains.
All fraction math goes through app/utils/fraction.ts. Every function there has Vitest tests in tests/.
Never send a child's name or personal details to any AI API.
Never copy textbook or Olympiad problems; write original problems.
Keep components small and accessible: keyboard friendly, aria labels, readable contrast.
Commands
npm run dev: start the app
npm test: run tests in watch mode
npm run test:run: run tests once with coverage
npm run typecheck: type check
Before finishing any task
Run npm run test:run and npm run typecheck, and fix anything failing.
Decisions
Record product and engineering decisions in docs/DECISIONS.md (what, why, alternatives, status). Check it before changing behavior, and update it in the same PR when a decision is made or replaced.
