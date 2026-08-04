# Project Context

## Stack
- Next.js 16 (App Router), React 19, TypeScript
- Supabase (Postgres) via `@supabase/ssr` / `@supabase/supabase-js`, RLS-enforced tables
- Validation: Zod schemas in `src/lib/validation/*`
- UI: Material 3 (M3) design system on top of shadcn/Radix primitives, Tailwind v4
- State/data: server components + a thin service/repository layering, `sonner` for toasts
- Tests: Vitest (unit) in `src/__tests__/**`, Playwright (e2e) in `e2e/**`

## Conventions
- Layering: `app/api/**/route.ts` (auth + HTTP) → `services/*.ts` (validation via `parseOrThrow`,
  business rules, orchestration) → `repositories/*.ts` (raw Supabase queries) → `db/database.types.ts`
  (generated Supabase types, hand-maintained here since no live DB access in this environment).
- Errors: services throw `ServiceError` (`src/lib/service-utils.ts`), routes catch via
  `handleRouteError` (`src/lib/api-route-utils.ts`).
- Zod schemas are `.strict()`, Polish-language validation messages (end users are Polish speakers);
  UI copy goes through `src/i18n/messages/{pl,en}.ts` + `useTranslations`/`getTranslations`.
- Imports (JSON paste/upload) follow a "exercise identification union" pattern: each exercise line is
  one of `exercise_id` (existing library exercise), `match_by_name` (fuzzy/case-insensitive lookup,
  falls back to a snapshot if not found), or `exercise_title` (+ optional type/part/details) for a
  brand-new snapshot exercise not in the library.
- DB enums are extended with `ALTER TYPE ... ADD VALUE` migrations guarded by
  `IF NOT EXISTS (SELECT 1 FROM pg_enum ...)` checks (see `supabase/migrations/2026*_add_*_to_exercise_part.sql`).
- No live Supabase project is connected in this working environment (anon key only, no DB password /
  service role) — migrations are authored but never pushed/applied here.

## Testing approach
- `pnpm test` (Vitest) for schema/service/lib unit tests.
- `pnpm type-check` (`tsc --noEmit`) and `pnpm lint` (ESLint) are run before considering work done.
- `pnpm test:e2e` (Playwright) exists for UI flows but is out of scope for backend-only changes.
