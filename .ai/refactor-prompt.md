You are a senior Next.js App Router architect. You have full repo access. Your job: review the entire codebase and produce a refactor plan focused on DRY + Single Responsibility, tailored to THIS repository structure. Write your plan in .ai/refactor-plan.md

REPO FACTS (use these in your analysis)

- App Router in src/app/** with route groups like (app)/ and API route handlers in src/app/api/**/route.ts
- Supabase in src/db (supabase.client.ts / supabase.server.ts) + repositories/ + services/
- Shared validation in src/lib/validation/\*\* (Zod)
- Many feature UI components live in src/components/\*\* (auth, exercises, workout-plans, workout-sessions, personal-records)
- Hooks in src/hooks/\*\* (forms, timers)
- Unit tests in src/**tests**/** and component tests in src/components/**tests**/**
- E2E tests in e2e/** using Playwright with page objects in e2e/pages/**
- There is a large “assistant” feature under components/workout-sessions/assistant/\*\* (likely complex state/effects)

GOALS

- Reduce duplication across features (DRY) and enforce SRP in components, hooks, repositories/services, route handlers.
- Keep behavior unchanged unless explicitly marked as bugfix.
- Prefer incremental refactors (commit-sized), low risk, with verification steps (unit/e2e).

WHAT TO AUDIT (scan ALL files)

1. src/app/\*\* pages/layouts: check if pages contain business logic / data access / validation directly.
2. src/app/api/\*\*/route.ts: ensure handlers are thin and delegate to services.
3. src/services/** vs src/repositories/**: confirm strict boundaries:
   - repositories = data access only (Supabase queries, no business rules)
   - services = use-cases (validation, mapping, rules, orchestration)
4. src/components/\*\*:
   - identify repeated patterns: empty-state, skeleton-loader, load-more-button, validation-errors, buttons (save/cancel/submit), filters/sorts.
   - propose shared UI primitives and feature modules.
5. src/hooks/\*\*:
   - find hooks that do too much (validation + submit + navigation + toasts + mapping).
   - propose splitting: controller hook vs pure helpers vs service calls.
6. src/lib/\*\*:
   - ensure “lib” has a clear purpose (shared pure utilities, domain rules, formatting, errors).
   - detect any “god utils.ts”.
7. types:
   - src/types.ts vs src/types/\*\*: check for duplication and unclear ownership.
8. tests:
   - ensure refactor plan includes where tests should be added/updated.

OUTPUT FORMAT (strict)

1. Repository Map (short)
   - Explain the current layering and where it breaks.

2. Findings (prioritized, minimum 15)
   For each finding:
   - Severity: High / Medium / Low
   - Symptom
   - Why it matters (maintainability, coupling, bugs, testability)
   - Evidence: exact file paths (and short snippets if needed)
   - Refactor suggestion: concrete changes, not generic

3. DRY Opportunities (make it very concrete)
   - Provide a list in the format:
     "Duplication pattern" -> "Exact files" -> "Proposed shared module/component"
     Must include at least:
   - empty states
   - skeleton loaders
   - validation error rendering
   - repeated form buttons
   - repeated filtering/sorting UI
   - repeated Supabase query patterns or error mapping

4. SRP & Boundaries
   - Identify “too big” modules (especially workout-sessions/assistant and form hooks)
   - For each: current responsibilities -> proposed split -> proposed new files

5. Proposed Target Architecture (pragmatic for this repo)
   - Recommend a structure that fits this repo, e.g. introduce:
     src/features/{auth,exercises,workout-plans,workout-sessions,personal-records}/...
     with subfolders: ui/, hooks/, model/, services/ (or similar).
   - Define import direction rules (UI must not import db/server code).
   - Clarify “shared” location (src/shared or src/lib) and what belongs there.

6. Refactor Plan (incremental, commit-sized)
   Provide phases with steps. Each step MUST include:
   - exact files to touch
   - what to change
   - how to verify (unit tests / e2e / manual flows)
   - risk level: Low/Med/High
     Include at least:
   - Phase 0: safety net (typecheck, lint, run vitest + playwright smoke)
   - Phase 1: low-risk DRY wins (shared UI primitives + common validation errors)
   - Phase 2: services/repositories boundary cleanup
   - Phase 3: “assistant” feature split (model/hooks/ui)
   - Phase 4: optional improvements (DX, consistency, performance)

7. Concrete Code Examples (at least 3)
   Provide minimal “Before -> After” examples:
   a) unify one duplicated UI component (e.g., EmptyState)
   b) split one overgrown hook (e.g., use-workout-plan-form or use-exercise-form)
   c) unify one route handler pattern delegating to service with validation

RULES

- Do not invent files. If something is missing, state it explicitly.
- Do not propose a rewrite. Keep changes incremental.
- Respect Next.js App Router server/client boundaries.
- Prefer TypeScript-first, minimal dependencies.

EXECUTION

- First: scan the whole repository.
- Then: produce the output exactly in the structure above.
