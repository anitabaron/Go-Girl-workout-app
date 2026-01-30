# Refactor Plan: DRY + Single Responsibility

## 1. Repository Map (short)

**Current layering:**

- **Pages** (`src/app/(app)/**/page.tsx`): Server Components that call `requireAuth()`, parse searchParams, invoke services, render components. Some pages (e.g. exercises) contain extra logic (loading exercises for filters).
- **API routes** (`src/app/api/**/route.ts`): Each handler defines its own `getUserIdFromSession()`, parses request, delegates to services, maps errors. Handlers are thin but boilerplate-heavy.
- **Actions** (`src/app/actions/`): Server actions for workout-plans and workout-sessions; call services and return `{ success, error, code, details }`.
- **Services** (`src/services/`): Validation (Zod), business rules, orchestration, error mapping. Call repositories.
- **Repositories** (`src/repositories/`): Supabase queries only. Return `{ data, error }` or `{ data, nextCursor, error }`. No business logic.
- **lib/api** (`src/lib/api/`): Client-side fetch wrappers for exercises, workout-plans, workout-sessions.
- **Components** (`src/components/`): Feature-specific UI. Many duplicated primitives (empty-state, skeleton-loader, load-more-button, validation-errors, cancel-button).
- **Hooks** (`src/hooks/`): Form hooks mix validation, submit, navigation, toasts, error mapping. `use-workout-plan-form` and `use-exercise-form` are large and multi-responsibility.

**Where it breaks:**

- `getUserIdFromSession` duplicated in 16 API route files.
- Empty states, skeleton loaders, load-more buttons, validation errors duplicated across features.
- Form hooks combine controller logic, error mapping, navigation, and toast handling.
- API routes have inconsistent error handling (some handle ZodError, some don’t; different 500 response shapes).
- `lib/auth.ts` has `getUserId()` and `requireAuth()`; API routes use a different `getUserIdFromSession()` pattern.

---

## 2. Findings (prioritized, minimum 15)

### F1. getUserIdFromSession duplicated in 16 API route files

- **Severity:** High
- **Symptom:** Same 10-line function copy-pasted in every API route.
- **Why it matters:** Bug fixes and behavior changes require edits in many files. Risk of divergence.
- **Evidence:** `src/app/api/exercises/route.ts`, `src/app/api/workout-plans/route.ts`, `src/app/api/workout-sessions/route.ts`, `src/app/api/personal-records/route.ts`, `src/app/api/exercises/[id]/route.ts`, `src/app/api/workout-plans/[id]/route.ts`, `src/app/api/workout-plans/import/route.ts`, `src/app/api/workout-plans/snapshots/[snapshot_id]/link/route.ts`, `src/app/api/workout-sessions/[id]/route.ts`, `src/app/api/workout-sessions/[id]/status/route.ts`, `src/app/api/workout-sessions/[id]/exercises/[order]/route.ts`, `src/app/api/workout-sessions/[id]/timer/route.ts`, `src/app/api/personal-records/[exercise_id]/route.ts`, `src/app/api/exercises/by-title/route.ts`, `src/app/api/admin/cleanup-orphaned-plan-exercises/route.ts`, `src/app/api/admin/cleanup-orphaned-sets/route.ts`
- **Refactor suggestion:** Add `src/lib/auth-api.ts` with `getUserIdFromSession(): Promise<string>` that throws `Error("UNAUTHORIZED")` when no user. Import in all API routes. Align with `lib/auth.ts` naming if desired.

### F2. Six nearly identical EmptyState components

- **Severity:** High
- **Symptom:** Same Card layout, icon, title, description, CTA button; only copy and links differ.
- **Why it matters:** UI changes require six edits. Inconsistent styling (e.g. `workout-sessions/start/empty-state` uses `bg-muted` vs others `bg-primary`).
- **Evidence:** `src/components/exercises/empty-state.tsx`, `src/components/workout-plans/empty-state.tsx`, `src/components/workout-sessions/empty-state.tsx`, `src/components/workout-sessions/start/empty-state.tsx`, `src/components/personal-records/empty-state.tsx`, `src/components/personal-records/empty-records-state.tsx`
- **Refactor suggestion:** Create `src/components/shared/empty-state.tsx` with props: `icon`, `title`, `description`, `actionHref`, `actionLabel`, `testId?`. Replace all six with this component.

### F3. Three nearly identical SkeletonLoader components

- **Severity:** Medium
- **Symptom:** Same Card grid layout; only `count` default and minor prop differences.
- **Why it matters:** Skeleton layout changes require three edits.
- **Evidence:** `src/components/exercises/skeleton-loader.tsx`, `src/components/workout-plans/skeleton-loader.tsx`, `src/components/personal-records/skeleton-loader.tsx` (personal-records has slightly different layout)
- **Refactor suggestion:** Create `src/components/shared/skeleton-loader.tsx` with props: `count`, `className`, optional `variant` (e.g. `card` | `compact`). Consolidate all three.

### F4. Two nearly identical LoadMoreButton components

- **Severity:** Medium
- **Symptom:** Same logic: loading state, toast on error, disabled while loading. Only aria-label and toast message differ.
- **Why it matters:** Logic or UX changes require two edits. `workout-sessions` already reuses `workout-plans` version.
- **Evidence:** `src/components/workout-plans/load-more-button.tsx`, `src/components/personal-records/load-more-button.tsx`
- **Refactor suggestion:** Create `src/components/shared/load-more-button.tsx` with props: `nextCursor`, `onLoadMore`, `ariaLabel`, `errorMessage`. Replace both; update `workout-sessions-list` to use shared component.

### F5. Two similar ValidationErrors components

- **Severity:** Medium
- **Symptom:** Both render a list of errors with AlertCircle icon. Different structure (exercises: simple list; workout-plans: has "Błędy walidacji" heading, list-disc).
- **Why it matters:** Inconsistent validation UX. Styling divergence.
- **Evidence:** `src/components/exercises/form/validation-errors.tsx`, `src/components/workout-plans/form/validation-errors.tsx`
- **Refactor suggestion:** Create `src/components/shared/validation-errors.tsx` with props: `errors: string[]`, optional `title?: string`. Use single implementation; exercises can pass `title={undefined}` for current behavior.

### F6. use-workout-plan-form does too much (320+ lines)

- **Severity:** High
- **Symptom:** Form state, RHF setup, field array, error mapping (rhfErrorsToFormErrors), validation error parsing from API, conflict/not-found/auth handlers, submit, navigation, toasts, scroll-to-error.
- **Why it matters:** Hard to test, hard to reuse. Violates SRP.
- **Evidence:** `src/hooks/use-workout-plan-form.ts`
- **Refactor suggestion:** Split into: (a) `use-workout-plan-form-controller.ts` – thin controller that composes form + handlers; (b) `lib/form/parse-api-validation-errors.ts` – pure function to map API error messages to field errors; (c) keep error handlers (toast, redirect) in controller or a small `use-form-error-handlers` hook.

### F7. use-exercise-form mixes fetch, validation parsing, navigation, toasts

- **Severity:** Medium
- **Symptom:** Direct fetch, parseValidationErrors, setError, setFormErrors, toast, router.push. Similar pattern to workout-plan-form but uses API directly instead of server actions.
- **Why it matters:** Inconsistent with workout-plan-form (actions vs fetch). Hard to test.
- **Evidence:** `src/hooks/use-exercise-form.ts`
- **Refactor suggestion:** Extract `parseValidationErrors` to shared `lib/form/parse-api-validation-errors.ts`. Consider introducing `use-exercise-form-submit` or using a shared `use-form-submit-with-errors` that handles 400/401/404/409/500 and calls parser + setError. Align with workout-plan-form pattern where feasible.

### F8. API route error handling inconsistent

- **Severity:** Medium
- **Symptom:** Exercises route does not explicitly handle ZodError; workout-plans and workout-sessions do. 500 responses differ: exercises returns `{ message }`, others return `{ message, details }`.
- **Why it matters:** Client error handling may assume a consistent shape. Debugging is harder.
- **Evidence:** `src/app/api/exercises/route.ts` (no ZodError branch), `src/app/api/workout-plans/route.ts` (ZodError + details in 500)
- **Refactor suggestion:** Create `src/lib/api-route-utils.ts` with `handleRouteError(error)` that returns `NextResponse.json` for UNAUTHORIZED, ServiceError, ZodError, and generic 500. Use in all routes.

### F9. API route query param parsing verbose and inconsistent

- **Severity:** Low
- **Symptom:** Exercises uses `Object.fromEntries` + schema parse. Workout-plans and workout-sessions manually build `queryParams` object with many if-blocks.
- **Why it matters:** More code, more bugs. Adding a new param requires multiple edits.
- **Evidence:** `src/app/api/workout-plans/route.ts` lines 39–64, `src/app/api/workout-sessions/route.ts` lines 39–75
- **Refactor suggestion:** Use `Object.fromEntries(url.searchParams.entries())` and pass to schema (with `limit` as number if present). Let Zod handle unknown/extra params via schema.

### F10. CancelButton duplicated with different dialogs

- **Severity:** Low
- **Symptom:** Exercises uses Dialog; workout-plans uses AlertDialog. Same concept: "unsaved changes" confirmation before navigate.
- **Why it matters:** Two implementations of the same UX pattern.
- **Evidence:** `src/components/exercises/form/cancel-button.tsx`, `src/components/workout-plans/form/cancel-button.tsx`
- **Refactor suggestion:** Create `src/components/shared/unsaved-changes-dialog.tsx` (or `ConfirmLeaveButton`) with props: `hasUnsavedChanges`, `onConfirmLeave`, `cancelLabel`, `confirmLabel`, `children` (the trigger). Use AlertDialog for consistency. Both CancelButtons use this.

### F11. Workout session assistant tightly couples many hooks

- **Severity:** Medium
- **Symptom:** `WorkoutSessionAssistant` wires useSaveExercise, useSessionForm, useSessionTimer, useSessionNavigation, useAutoPause. Complex ref passing (formDataRef, timerRefs, etc.).
- **Why it matters:** Hard to reason about. Testing requires full store + all hooks.
- **Evidence:** `src/components/workout-sessions/assistant/workout-session-assistant.tsx`
- **Refactor suggestion:** Extract `useWorkoutSessionAssistant(sessionId, initialSession)` that returns `{ ... }` with all derived state and handlers. Component becomes a thin renderer. Enables testing the orchestration logic separately.

### F12. lib/auth.ts vs API getUserIdFromSession divergence

- **Severity:** Low
- **Symptom:** `getUserId()` throws generic message; `getUserIdFromSession()` throws "UNAUTHORIZED". Different usage contexts (Server Components vs API routes).
- **Why it matters:** Two ways to get userId. Naming is confusing.
- **Evidence:** `src/lib/auth.ts`, all API routes
- **Refactor suggestion:** After extracting `getUserIdFromSession` to `lib/auth-api.ts`, document: `getUserId`/`requireAuth` for Server Components (redirect), `getUserIdFromSession` for API routes (throws). Consider `getUserIdOrThrow` as alias if desired.

### F13. Personal-records list duplicates workout-plans list pattern

- **Severity:** Low
- **Symptom:** Same structure: fetch, cursor pagination, LoadMoreButton, SkeletonLoader, EmptyState, handleLoadMore with toast.
- **Why it matters:** Adding features (e.g. optimistic update) requires parallel changes.
- **Evidence:** `src/components/personal-records/personal-records-list.tsx`, `src/components/workout-plans/workout-plans-list.tsx`
- **Refactor suggestion:** Consider a generic `usePaginatedList<T>(fetchFn, options)` hook. Lower priority; the components are readable as-is.

### F14. Types split between src/types.ts and src/types/

- **Severity:** Low
- **Symptom:** `src/types.ts` has DTOs, API types, entities. `src/types/` has auth, workout-plan-form, workout-session-assistant. No clear rule for what goes where.
- **Why it matters:** Unclear ownership. Risk of circular imports.
- **Evidence:** `src/types.ts` (300+ lines), `src/types/auth.ts`, `src/types/workout-plan-form.ts`, `src/types/workout-session-assistant.ts`
- **Refactor suggestion:** Document: `types.ts` = shared DTOs, API contracts, DB-derived types. `types/*` = feature-specific form/UI state. Move `ValidationErrorsProps` from `workout-plan-form` to shared if ValidationErrors becomes shared.

### F15. Exercises page fetches exercises twice for filters

- **Severity:** Low
- **Symptom:** Page calls `listExercisesService` for filters (sort title, limit 50) and again for main list. Two round-trips.
- **Why it matters:** Minor performance cost. Could be one call with different params or a dedicated lightweight endpoint.
- **Evidence:** `src/app/(app)/exercises/page.tsx` lines 34–46, 46
- **Refactor suggestion:** Consider single call with `limit: 50` and reuse for both filters and list if params allow; or add `listExerciseTitlesService` that returns only `{ id, title }`. Low priority.

---

## 3. DRY Opportunities (concrete)

| Duplication pattern                                                  | Exact files                                                                                                                                                                                                                | Proposed shared module/component                                                                                         |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Empty state (Card + icon + title + description + CTA)                | `exercises/empty-state.tsx`, `workout-plans/empty-state.tsx`, `workout-sessions/empty-state.tsx`, `workout-sessions/start/empty-state.tsx`, `personal-records/empty-state.tsx`, `personal-records/empty-records-state.tsx` | `src/components/shared/empty-state.tsx`                                                                                  |
| Skeleton loader (Card grid)                                          | `exercises/skeleton-loader.tsx`, `workout-plans/skeleton-loader.tsx`, `personal-records/skeleton-loader.tsx`                                                                                                               | `src/components/shared/skeleton-loader.tsx`                                                                              |
| Validation error list (AlertCircle + list)                           | `exercises/form/validation-errors.tsx`, `workout-plans/form/validation-errors.tsx`                                                                                                                                         | `src/components/shared/validation-errors.tsx`                                                                            |
| Load more button (loading + toast)                                   | `workout-plans/load-more-button.tsx`, `personal-records/load-more-button.tsx`                                                                                                                                              | `src/components/shared/load-more-button.tsx`                                                                             |
| Cancel/unsaved changes dialog                                        | `exercises/form/cancel-button.tsx`, `workout-plans/form/cancel-button.tsx`                                                                                                                                                 | `src/components/shared/unsaved-changes-dialog.tsx` or `ConfirmLeaveButton`                                               |
| getUserIdFromSession                                                 | 16 API route files                                                                                                                                                                                                         | `src/lib/auth-api.ts`                                                                                                    |
| API validation error → field mapping                                 | `use-workout-plan-form.ts` (handleValidationError), `use-exercise-form.ts` (parseValidationErrors)                                                                                                                         | `src/lib/form/parse-api-validation-errors.ts`                                                                            |
| API route error handling (UNAUTHORIZED, ServiceError, ZodError, 500) | All API route catch blocks                                                                                                                                                                                                 | `src/lib/api-route-utils.ts`                                                                                             |
| Filter/sort URL param pattern                                        | `exercise-filters.tsx`, `workout-plan-filters.tsx`, `exercise-sort.tsx`, `workout-plan-sort.tsx`                                                                                                                           | Consider `useUrlFilters<T>(schema, defaultValues)` hook; lower priority                                                  |
| Supabase cursor encode/decode                                        | `repositories/exercises.ts` (encodeCursor, decodeCursor, applyCursorFilter)                                                                                                                                                | Similar logic may exist in workout-plans/personal-records repos; extract to `src/lib/pagination/cursor.ts` if duplicated |

---

## 4. SRP & Boundaries

### use-workout-plan-form (320 lines)

- **Current responsibilities:** Form state, RHF + field array, error mapping (RHF→form), API error parsing, conflict/not-found/auth handlers, submit, navigation, toasts, scroll-to-error.
- **Proposed split:**
  - `use-workout-plan-form.ts` (slim): Form setup, field array, watch, handlers that delegate.
  - `lib/form/parse-api-validation-errors.ts`: `parseApiValidationErrors(message, details, fieldMapping) => { fieldErrors, formErrors }`.
  - `lib/form/use-form-error-handlers.ts` (optional): `handleBadRequest`, `handleConflict`, `handleNotFound`, `handleAuth` – toast + setError/redirect. Reusable.
- **Proposed new files:** `src/lib/form/parse-api-validation-errors.ts`, optionally `src/hooks/use-form-error-handlers.ts`

### use-exercise-form (200 lines)

- **Current responsibilities:** Form state, fetch, validation parsing, setError, toasts, navigation.
- **Proposed split:** Same as above – use shared `parseApiValidationErrors`. Consider `useExerciseFormSubmit` that encapsulates fetch + error handling, or align with server-action pattern like workout-plans.

### Workout session assistant (workout-session-assistant.tsx + hooks)

- **Current responsibilities:** Store reset, save, form, timer, navigation, auto-pause, exit. Component orchestrates 5+ hooks.
- **Proposed split:**
  - `useWorkoutSessionAssistant(sessionId, initialSession)`: Returns `{ session, currentExercise, formData, formErrors, handlers, canGoNext, canGoPrevious, ... }`. Encapsulates all hook wiring.
  - `WorkoutSessionAssistant`: Pure presentational – receives props from the hook and renders.
- **Proposed new files:** `src/hooks/use-workout-session-assistant.ts`

### Repositories vs services

- **Current:** Repositories = Supabase only. Services = validation, mapping, rules. Boundary is clear.
- **No change needed.** Optional: ensure no service imports from `supabase.client` (client-side); only `supabase.server` in API/actions.

---

## 5. Proposed Target Architecture (pragmatic)

**Keep current structure** with incremental additions. Do **not** introduce `src/features/` yet – it would require a large move. Instead:

1. **Add `src/components/shared/`** – shared UI primitives: `empty-state`, `skeleton-loader`, `load-more-button`, `validation-errors`, `unsaved-changes-dialog` (or `ConfirmLeaveButton`).

2. **Add `src/lib/` submodules:**
   - `src/lib/auth-api.ts` – `getUserIdFromSession()` for API routes.
   - `src/lib/api-route-utils.ts` – `handleRouteError(error)` for consistent API error responses.
   - `src/lib/form/parse-api-validation-errors.ts` – shared validation error parser.

3. **Import direction rules:**
   - `components/*` must NOT import from `db/`, `repositories/`, `services/`, or `app/api/`.
   - `components/*` may import from `lib/` (utils, validation, auth-api only for server), `hooks/`, `stores/`, `types/`.
   - `app/api/**` imports: `lib/auth-api`, `lib/api-route-utils`, `lib/validation`, `services/`, `lib/http/errors`.

4. **Shared location:** Use `src/components/shared/` for cross-feature UI. Use `src/lib/` for pure utilities, auth, and API helpers. No `src/shared/` folder for now.

5. **Types:** Keep `src/types.ts` for DTOs and API contracts. Keep `src/types/*` for feature-specific form/UI state. Add a short comment in `types.ts` documenting this.

---

## 6. Refactor Plan (incremental, commit-sized)

### Phase 0: Safety net

| Step | Files | What to change                           | Verify          | Risk |
| ---- | ----- | ---------------------------------------- | --------------- | ---- |
| 0.1  | -     | Run `pnpm typecheck` (or `tsc --noEmit`) | Exit 0          | Low  |
| 0.2  | -     | Run `pnpm lint`                          | Exit 0          | Low  |
| 0.3  | -     | Run `pnpm test` (vitest)                 | All pass        | Low  |
| 0.4  | -     | Run `pnpm exec playwright test` (smoke)  | Core flows pass | Low  |

### Phase 1: Low-risk DRY wins

| Step | Files                                                                                | What to change                                                         | Verify                           | Risk |
| ---- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | -------------------------------- | ---- |
| 1.1  | Create `src/lib/auth-api.ts`                                                         | Add `getUserIdFromSession()`                                           | -                                | Low  |
| 1.2  | All 16 API route files                                                               | Replace local `getUserIdFromSession` with import from `@/lib/auth-api` | API routes return same responses | Low  |
| 1.3  | Create `src/components/shared/empty-state.tsx`                                       | Props: icon, title, description, actionHref, actionLabel, testId       | -                                | Low  |
| 1.4  | exercises, workout-plans, workout-sessions, personal-records, workout-sessions/start | Replace EmptyState with shared component                               | Manual: each list empty state    | Low  |
| 1.5  | Create `src/components/shared/skeleton-loader.tsx`                                   | Consolidate exercises + workout-plans + personal-records               | Loading states render correctly  | Low  |
| 1.6  | Create `src/components/shared/validation-errors.tsx`                                 | Consolidate exercises + workout-plans                                  | Form validation errors display   | Low  |
| 1.7  | Create `src/components/shared/load-more-button.tsx`                                  | Consolidate workout-plans + personal-records                           | Pagination works                 | Low  |

### Phase 2: Services/repositories boundary cleanup

| Step | Files                                    | What to change                                                                                         | Verify                             | Risk   |
| ---- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------- | ------ |
| 2.1  | Create `src/lib/api-route-utils.ts`      | Add `handleRouteError(error)`                                                                          | -                                  | Low    |
| 2.2  | API routes                               | Use `handleRouteError` in catch blocks; remove duplicated UNAUTHORIZED/ServiceError/ZodError/500 logic | E2E + manual API calls             | Medium |
| 2.3  | workout-plans, workout-sessions route.ts | Simplify query param parsing with `Object.fromEntries` + schema                                        | List endpoints return correct data | Low    |

### Phase 3: Assistant feature split

| Step | Files                                                | What to change                                                                                            | Verify                      | Risk   |
| ---- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------- | ------ |
| 3.1  | Create `src/hooks/use-workout-session-assistant.ts`  | Extract orchestration logic from WorkoutSessionAssistant                                                  | -                           | Medium |
| 3.2  | `workout-session-assistant.tsx`                      | Use `useWorkoutSessionAssistant`, render from props                                                       | E2E workout-session-flow    | Medium |
| 3.3  | Create `src/lib/form/parse-api-validation-errors.ts` | Extract parseValidationErrors from use-exercise-form and handleValidationError from use-workout-plan-form | Form submit with 400 errors | Low    |
| 3.4  | use-workout-plan-form, use-exercise-form             | Use shared parser                                                                                         | Form error handling         | Low    |

### Phase 4: Optional improvements

| Step | Files                                                     | What to change                                                 | Verify                      | Risk |
| ---- | --------------------------------------------------------- | -------------------------------------------------------------- | --------------------------- | ---- |
| 4.1  | Create `src/components/shared/unsaved-changes-dialog.tsx` | Extract CancelButton pattern                                   | Cancel with unsaved changes | Low  |
| 4.2  | exercises/form, workout-plans/form                        | Use shared CancelButton                                        | Same as 4.1                 | Low  |
| 4.3  | use-workout-plan-form                                     | Split error handlers into `use-form-error-handlers` if desired | Same behavior               | Low  |
| 4.4  | types/                                                    | Add README or comment documenting types.ts vs types/\*         | -                           | Low  |

---

## 7. Concrete Code Examples

### a) Unify EmptyState

**Before** (exercises/empty-state.tsx):

```tsx
export function EmptyState() {
  return (
    <Card className="mx-auto min-w-[320px] max-w-md ..." data-test-id="exercises-empty-state">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 ...">
          <Dumbbell className="h-8 w-8 text-destructive" aria-hidden="true" />
        </div>
        <CardTitle className="text-2xl font-extrabold text-destructive break-words">
          Nie masz jeszcze żadnych ćwiczeń
        </CardTitle>
        <CardDescription className="mt-2 ...">
          Dodaj pierwsze ćwiczenie, aby rozpocząć budowanie swojej biblioteki treningowej
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button asChild size="lg" ...>
          <Link href="/exercises/new">Dodaj pierwsze ćwiczenie</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
```

**After** (shared/empty-state.tsx):

```tsx
type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  testId?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
  testId,
}: EmptyStateProps) {
  return (
    <Card
      className="mx-auto min-w-[320px] max-w-md rounded-2xl border border-border ..."
      data-test-id={testId}
    >
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
          {icon}
        </div>
        <CardTitle className="text-2xl font-extrabold text-destructive break-words">
          {title}
        </CardTitle>
        <CardDescription className="mt-2 text-zinc-600 dark:text-zinc-400 break-words">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button
          asChild
          size="lg"
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
        >
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Usage** (exercises/empty-state.tsx or inline in exercises-list):

```tsx
<EmptyState
  icon={<Dumbbell className="h-8 w-8 text-destructive" aria-hidden="true" />}
  title="Nie masz jeszcze żadnych ćwiczeń"
  description="Dodaj pierwsze ćwiczenie, aby rozpocząć budowanie swojej biblioteki treningowej"
  actionHref="/exercises/new"
  actionLabel="Dodaj pierwsze ćwiczenie"
  testId="exercises-empty-state"
/>
```

---

### b) Split use-workout-plan-form – extract validation error parser

**Before** (inline in use-workout-plan-form.ts):

```ts
const handleValidationError = (errorData: {
  message?: string;
  details?: string;
}) => {
  const message = errorData.message ?? "";
  const details = errorData.details ?? "";
  const errorMessages = message.split("; ").filter((m) => m.trim());
  // ... field mapping, setError, toast
};
```

**After** (lib/form/parse-api-validation-errors.ts):

```ts
export type ParseResult = {
  fieldErrors: Record<string, string>;
  formErrors: string[];
};

export function parseApiValidationErrors(
  message: string | undefined,
  details: string | undefined,
  fieldMapping: Record<string, string>,
): ParseResult {
  const fieldErrors: Record<string, string> = {};
  const formErrors: string[] = [];
  const errorMessages = (message ?? "").split("; ").filter((m) => m.trim());
  // ... assign to field or formErrors based on fieldMapping
  if (details && !errorMessages.some((m) => details?.includes(m)))
    formErrors.push(details);
  return { fieldErrors, formErrors };
}
```

**Usage in use-workout-plan-form:**

```ts
const { fieldErrors, formErrors } = parseApiValidationErrors(
  result.error,
  result.details,
  { name: "name", description: "description", part: "part" },
);
for (const [field, msg] of Object.entries(fieldErrors)) {
  setError(field as keyof WorkoutPlanFormValues, { message: msg });
}
if (formErrors.length) setError("root", { message: formErrors.join("; ") });
toast.error("Popraw błędy w formularzu.");
```

---

### c) Unify API route – delegate to service with shared auth + error handling

**Before** (api/exercises/route.ts):

```ts
async function getUserIdFromSession(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error("UNAUTHORIZED");
  return user.id;
}

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    // ...
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { message: "Brak autoryzacji...", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }
    if (error instanceof ServiceError) return respondWithServiceError(error);
    console.error("GET /api/exercises unexpected error", error);
    return NextResponse.json(
      { message: "Wystąpił błąd serwera." },
      { status: 500 },
    );
  }
}
```

**After** (api/exercises/route.ts):

```ts
import { getUserIdFromSession } from "@/lib/auth-api";
import { handleRouteError } from "@/lib/api-route-utils";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromSession();
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const parsedQuery = exerciseQuerySchema.parse({
      ...params,
      limit: params.limit ? Number(params.limit) : undefined,
    });
    const result = await listExercisesService(userId, parsedQuery);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GET /api/exercises");
  }
}
```

**New** (lib/auth-api.ts):

```ts
import { createClient } from "@/db/supabase.server";

export async function getUserIdFromSession(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) throw new Error("UNAUTHORIZED");
  return user.id;
}
```

**New** (lib/api-route-utils.ts):

```ts
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ServiceError } from "@/lib/service-utils";
import { respondWithServiceError } from "@/lib/http/errors";

export function handleRouteError(
  error: unknown,
  context?: string,
): NextResponse {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json(
      {
        message: "Brak autoryzacji. Zaloguj się ponownie.",
        code: "UNAUTHORIZED",
      },
      { status: 401 },
    );
  }
  if (error instanceof ServiceError) return respondWithServiceError(error);
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        message: "Nieprawidłowe parametry zapytania.",
        code: "BAD_REQUEST",
        details: error.issues.map((i) => i.message).join("; "),
      },
      { status: 400 },
    );
  }
  console.error(context ?? "API route unexpected error", error);
  return NextResponse.json(
    {
      message: "Wystąpił błąd serwera.",
      details: error instanceof Error ? error.message : String(error),
    },
    { status: 500 },
  );
}
```

---

## Summary

- **Phase 0:** Establish safety net.
- **Phase 1:** Extract `getUserIdFromSession`, shared EmptyState, SkeletonLoader, ValidationErrors, LoadMoreButton. Low risk, high DRY impact.
- **Phase 2:** Centralize API error handling and simplify query parsing.
- **Phase 3:** Split assistant orchestration and form validation parsing.
- **Phase 4:** Optional shared CancelButton and form error handlers.

Each step is commit-sized. Verification uses unit tests, E2E, and manual checks as noted.
