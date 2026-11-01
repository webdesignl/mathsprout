# DinnerPilot – AI Learning Plan

Oct 23, 2026 · Study in parallel with the build phases in `docs/DINNERPILOT_PLAN.md`.

**How to read this.** Facts marked ✅ were read from the course page on Oct 23, 2026. Facts marked ⚠️ could not be verified (pages blocked automated reading, or the page does not show the number). Prices change often and are shown on the page only at checkout, so confirm before paying. I did not find a verified price for any paid option; the figures marked "typical" are general expectations, not checked.

## Top picks

| # | Course | Platform | Instructor | Rating (reviews) | Price | Hours | Certificate | Why it fits DinnerPilot |
|---|---|---|---|---|---|---|---|---|
| 1 | [Building with the Claude API](https://anthropic.skilljar.com/claude-with-the-anthropic-api) | Anthropic Academy (Skilljar) | Anthropic (instructor not shown) | ⚠️ not shown | ✅ Free ("Register \| FREE") | ⚠️ not on page; a third-party summary says about 8 hours (unverified) | ⚠️ not stated on the page; a third-party summary says completion certificates are given | Exactly your stack: Claude API, tool use, streaming, and retrieval. Phases 4, 5 and 7 |
| 2 | [Introduction to Model Context Protocol](https://www.coursera.org/learn/introduction-to-model-context-protocol) | Coursera (offered by Anthropic) | Anthropic Academy | ✅ 4.8 (36 reviews), 13,643 enrolled | ⚠️ no price shown; "Included with Coursera Plus". Free version on Anthropic's site: [same course, FREE](https://anthropic.skilljar.com/introduction-to-model-context-protocol) | ✅ 4 hours | ✅ Shareable certificate (Coursera) | Phase 9 MCP server; the free Skilljar copy gives the content at no cost, the Coursera copy gives a LinkedIn-ready certificate |
| 3 | [MCP: Build Rich-Context AI Apps with Anthropic](https://www.deeplearning.ai/short-courses/mcp-build-rich-context-ai-apps-with-anthropic/) | DeepLearning.AI | Elie Schoppik (Anthropic) | ⚠️ none shown | ✅ Free during their platform beta; later pricing ⚠️ not shown | ✅ 1h58m | ⚠️ not stated; page says "Earn an accomplishment with PRO" | Fast hands-on build of an MCP server and client (Phase 9). Intermediate level, needs basic Python |
| 4 | [Generative AI with Large Language Models](https://www.coursera.org/learn/generative-ai-with-llms) | Coursera (DeepLearning.AI + AWS) | Chris Fregly, Antje Barth, Shelbee Eigenbrode, +1 | ✅ 4.8 (3,656 reviews), 450,683 enrolled | ⚠️ no price shown; included with Coursera Plus; financial aid available | ✅ about 17 hours (page also says 2 weeks at 10 h/week) | ✅ Shareable certificate, requires the paid certificate experience | Best-rated, widely recognised LLM fundamentals; pairs with Phases 1–3 so you understand what the model does |

**If you only pick four:** Building with the Claude API (free), the MCP course on Coursera (certificate) or DeepLearning.AI (free), Generative AI with LLMs (fundamentals, certificate), and a RAG course (below).

## More courses by topic

### LLM and AI fundamentals

| Course | Platform | Rating / reviews | Price | Hours | Certificate | Notes |
|---|---|---|---|---|---|---|
| Generative AI with Large Language Models (above) | Coursera | ✅ 4.8 / 3,656 | ⚠️ not shown | ✅ ~17 | ✅ paid | Theory-heavy; use as background |
| [Claude Code in Action and other Anthropic Academy courses](https://anthropic.skilljar.com/) | Anthropic Academy | ⚠️ none | ✅ Free | ⚠️ | ⚠️ | Catalog lists many free courses; third-party posts count 13 to 21, so the number is not verified |

### Building agents with tool use

| Course | Platform | Instructor | Rating | Price | Hours | Certificate | Notes |
|---|---|---|---|---|---|---|---|
| [Agentic AI](https://learn.deeplearning.ai/courses/agentic-ai) | DeepLearning.AI | Andrew Ng | ⚠️ none shown | ⚠️ not shown | ✅ 9h55m (catalogue) | ⚠️ not stated | Agent patterns: reflection, tool use, planning, multi-agent. Phases 4–6. The course page itself was not opened |
| [Functions, Tools and Agents with LangChain](https://www.deeplearning.ai/short-courses/functions-tools-agents-langchain/) | DeepLearning.AI | Harrison Chase | ⚠️ none | ✅ free during beta | ✅ 1h54m | ⚠️ | Function calling concepts transfer to Claude tool use. Uses LangChain, which we are not using |
| [AI Agentic Design Patterns with AutoGen](https://www.deeplearning.ai/short-courses/ai-agentic-design-patterns-with-autogen/) | DeepLearning.AI | Chi Wang, Qingyun Wu | ⚠️ none | ✅ free during beta | ✅ 1h35m | ⚠️ | Optional; multi-agent ideas |

### RAG

| Course | Platform | Instructor | Rating | Price | Hours | Certificate | Notes |
|---|---|---|---|---|---|---|---|
| [Retrieval Augmented Generation (RAG)](https://www.deeplearning.ai/courses/retrieval-augmented-generation) | DeepLearning.AI | ⚠️ not read | ⚠️ none shown | ⚠️ not shown | ✅ 26h3m (catalogue) | ⚠️ not stated | Most complete RAG path; long, so take only the modules on embeddings and retrieval for Phase 7. The Coursera version of this course could not be verified (the URL I tried returned 404) |
| [Building Applications with Vector Databases](https://www.deeplearning.ai/short-courses/building-applications-vector-databases/) | DeepLearning.AI | Tim Tully (Pinecone) | ⚠️ none | ✅ free during beta | ✅ 1h33m | ⚠️ | Short intro to embeddings and vector search; we use pgvector instead of Pinecone |
| [Building Agentic RAG with Llamaindex](https://www.deeplearning.ai/short-courses/building-agentic-rag-with-llamaindex/) | DeepLearning.AI | Jerry Liu | ⚠️ none | ✅ free during beta | ✅ 54m | ⚠️ | Quick view of agents that choose between retrieval tools |

### Udemy (paid, watch for sales)

Udemy blocked automated reading of its pages, so everything here is from search snapshots, not course pages. Check the live page, and wait for a sale.

| Course | Rating / reviews (snapshot) | Price | Notes |
|---|---|---|---|
| LLM Engineering, RAG, & AI Agents Masterclass [2026] | about 4.5 (864 ratings) in a Udemy listing snapshot; a reseller showed 4.6 (677) | ⚠️ not verified; Udemy courses typically go on sale for about $12–20, unconfirmed | Covers RAG, agents and MCP with several frameworks; broad but shallow |
| RAG, AI Agents and Generative AI with Python and OpenAI 2026 | about 4.5 (868 ratings), 11,865 students, updated 6/2026 | ⚠️ not verified | Uses OpenAI and LangChain; concepts transfer |

I would not buy a Udemy course first. The free Anthropic and DeepLearning.AI courses cover the same ground, and the Udemy snapshots are the least verified numbers here.

## Certificates and cost

- **Free with a certificate (unverified):** Anthropic Academy. Third-party posts say courses include completion certificates, but the course pages I read did not say so. Register and check the last lesson.
- **Free to learn, certificate extra:** DeepLearning.AI shows free enrollment during their beta; the certificate/"accomplishment" is tied to a PRO plan whose price I could not see.
- **Coursera:** Certificates need Coursera Plus or a per-course purchase. Check for a free trial, financial aid (the LLM course says financial aid is available), or audit mode on the enrollment dialog. Prices not verified.
- Cheapest plan: do all learning on the free Anthropic and DeepLearning.AI courses; buy one Coursera certificate (the Anthropic MCP course or Generative AI with LLMs) for LinkedIn if you want a credential.

## Study order: 8 weeks, aligned to build phases

Plan about 4 to 6 study hours a week. Build on weekends; study on weeknights.

| Week | Build phase | Study | What you take back into the code |
|---|---|---|---|
| 1 | Phase 1 Foundation | Generative AI with LLMs, weeks 1–2 (how LLMs work, prompting, tokens) | Know what tokens, temperature and context windows mean before you pay for them |
| 2 | Phase 2 Safety engine | Finish Generative AI with LLMs week 3 (or skim); read Anthropic docs on prompting | Why code, not the model, must decide allergies |
| 3 | Phase 3 Households + RLS | Building with the Claude API: setup, requests, system prompts, streaming | Server-only API calls, the request/response shape |
| 4 | Phase 4 Agent v1 | Building with the Claude API: tool use sections | Write the tool definitions and the loop |
| 5 | Phase 5–6 Visible steps, approval | DeepLearning.AI Agentic AI: reflection, tool use, planning modules | Step events, retry-after-failure, human-in-the-loop |
| 6 | Phase 7 RAG | Building with the Claude API: retrieval section, plus the RAG course modules on embeddings and retrieval; Vector Databases short course | Chunking, embeddings, `match_recipes`, recall fixtures |
| 7 | Phase 8 Evals | Rest of the Agentic AI course (evaluation, error analysis); revisit prompt-injection notes | Eval fixtures and invariants |
| 8 | Phase 9 MCP | Introduction to MCP (Anthropic) and DeepLearning.AI MCP course | Read-only MCP server for pantry and recipes |

Phase 10 (public demo) needs no new course; reuse the MathSprout demo pattern.

## Checklist after each week

- Write 3 sentences in `docs/DECISIONS.md` if the course changed a choice (for example the embeddings provider).
- Add one test or fixture inspired by what you learned.
- Note one thing for the LinkedIn post (a plain-language lesson, no personal data).

## What could not be verified

- Prices for every paid option, and the price of DeepLearning.AI PRO.
- Ratings and review counts for all DeepLearning.AI and Anthropic Academy pages (none shown).
- Hours and certificates for the Anthropic Academy pages (not shown on the pages).
- The Coursera version of the DeepLearning.AI RAG course (404) and both Udemy course pages (blocked).
- Whether free-enrolled learners get certificates on DeepLearning.AI.
