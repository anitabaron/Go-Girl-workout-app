# M3 Migration Plan: Legacy UI → Material 3 Design

## Codebase Scan Summary

### 1. Existing Routes

**Legacy routes** (under `src/app/(app)/(legacy)/`):

- `/` – Home (FeaturesOverview)
- `/exercises` – Exercises list
- `/exercises/new` – New exercise form
- `/exercises/[id]` – Exercise details
- `/exercises/[id]/edit` – Edit exercise
- `/workout-plans` – Plans list
- `/workout-plans/new` – New plan
- `/workout-plans/[id]` – Plan details
- `/workout-plans/[id]/edit` – Edit plan
- `/workout-sessions` – Sessions list
- `/workout-sessions/start` – Start session
- `/workout-sessions/[id]` – Session details
- `/workout-sessions/[id]/active` – Active session
- `/personal-records` – PR list
- `/personal-records/[exercise_id]` – PR by exercise
- `/import-instruction` – Import instructions
- `/kitchen-sink`, `/test` – Dev pages

**M3 routes** (under `src/app/(app)/(m3)/m3/`):

- `/m3` – M3 Home (HeroReveal, Surface, ScrollReveal)
- `/m3/exercises` – M3 Exercises list (mock data, links to legacy `/exercises/*`)

**Routing mechanism**: `src/proxy.ts` rewrites `/`, `/exercises`, `/exercises/*` → `/m3`, `/m3/exercises`, `/m3/exercises/*` when `design_mode` cookie is `m3` or `NEXT_PUBLIC_UI_V2=true`.

### 2. Key UI Components

| Category        | Legacy (`src/components/`)                                                            | M3 (`src/app/(app)/(m3)/m3/_components/`) | shadcn (`src/components/ui/`)                |
| --------------- | ------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------- |
| **Buttons**     | AddExerciseButton, CreatePlanButton, etc.                                             | —                                         | Button (used in both)                        |
| **Cards**       | ExerciseCard, WorkoutPlanCard, WorkoutSessionCard, FeatureCard                        | —                                         | Card, CardHeader, CardContent                |
| **Forms**       | ExerciseForm, ExerciseFormFields, WorkoutPlanForm                                     | ExercisesToolbar                          | Input, Select, Textarea, FormField, Checkbox |
| **Modals**      | DeleteExerciseDialog, DeleteWorkoutPlanDialog, AddExerciseDialog, CancelSessionDialog | —                                         | Dialog, AlertDialog                          |
| **Nav**         | TopNavigation, BottomNavigation, PageHeader, PageHeaderSection                        | NavigationRail, PageHeader                | —                                            |
| **Empty state** | EmptyState (shared)                                                                   | EmptyState (M3-specific)                  | —                                            |
| **Surfaces**    | —                                                                                     | Surface, HeroReveal, ScrollReveal         | —                                            |
| **Other**       | ExerciseFilters, ExerciseSort, WorkoutPlanFilters                                     | ExercisesToolbar, DarkModeToggle          | Badge, Skeleton, Sheet, Tabs                 |

### 3. Global Legacy CSS Impact

- **`src/app/globals.css`** (imported in root `layout.tsx`):
  - `:root` tokens: `--neutral-*`, `--brand-*`, `--semantic-*`, shadcn vars (`--background`, `--primary`, etc.)
  - `body` styles: background, font, selection
  - `*:focus-visible` and `::selection` global overrides
  - `@theme inline` Tailwind mapping
  - `.dark` and `@media (prefers-color-scheme: dark)` overrides
- **Effect**: All routes receive globals.css. M3 layout wraps content in `.ui-m3`; `m3.css` overrides shadcn vars within `.ui-m3`, but body/focus/selection still come from globals.css.
- **Leak points**: Legacy pages use `bg-secondary`, `text-zinc-950`, `dark:bg-zinc-950`, `rounded-2xl`, `border-border`; M3 uses `var(--m3-*)` and `.m3-*` classes. Both share the same shadcn primitives (Button, Card, Input) which read CSS vars—M3 overrides those vars under `.ui-m3`.

> **⚠️ UWAGA: Komponenty shadcn muszą pozostać CZYSTE**
>
> Komponenty w `src/components/ui/` (Button, Card, Input, Select, Dialog itd.) **nie mogą zawierać nadpisanych stylów z legacy globals.css**. Powinny być czystymi primitives shadcn – bez hardcodowanych kolorów, radiusów ani klas legacy (`bg-secondary`, `text-zinc-*`, `rounded-2xl`, `dark:bg-zinc-*` itp.). Stylowanie M3 odbywa się wyłącznie przez:
>
> 1. **m3.css** – nadpisanie zmiennych CSS (`--background`, `--primary` itd.) w scope `.ui-m3`
> 2. **M3 wrappery** (`m3/_ui/`) – dodawanie klas `.m3-*` lub `m3-cta` do czystych komponentów shadcn
>
> Jeśli komponenty shadcn mają wbudowane style legacy, M3 nie będzie wyglądać spójnie i migracja się skomplikuje.

---

## Migration Plan (Points 1–7)

### 1) Define rules: “M3-ready” vs “legacy-only”

**Purpose**: Clear boundaries so M3 routes never depend on legacy styles or components.

**Actions**:

- Add `.cursor/rules/m3-migration.mdc` with:
  - **M3-ready**: Routes under `(m3)/m3/`; components under `m3/_components/` or `m3/_ui/`; only `m3.css` tokens (`--m3-*`, `.m3-*`); no `bg-secondary`, `text-zinc-*`, `dark:bg-zinc-*`, `rounded-2xl` (use `var(--m3-radius-*)`).
  - **Legacy-only**: Routes under `(legacy)/`; components under `components/`; may use globals.css tokens and legacy patterns.
  - **Shadcn purity**: Komponenty w `components/ui/` muszą być czyste – bez nadpisanych stylów z legacy globals.css. Stylowanie M3 tylko przez m3.css i M3 wrappery.
- Add ESLint rule or comment convention: `// @m3-only` for M3-scoped components.

**Output artifacts**:

- `.cursor/rules/m3-migration.mdc`
- Optional: `eslint-plugin` or `// eslint-disable` for cross-import checks.

**Acceptance criteria**:

- Rule file exists and is referenced in project docs.
- No M3 page imports from `components/layout/`, `components/navigation/` (legacy nav), or uses legacy Tailwind classes.

**Risk notes**:

- Overly strict rules may block valid shared logic (hooks, services). Exclude `hooks/`, `lib/`, `services/` from style rules.

---

### 2) Create an Adapter/UI layer (M3 wrappers) instead of rewriting everything

**Purpose**: Reuse shadcn primitives and business logic while isolating M3 styling.

**Krytyczne**: Komponenty shadcn (`Button`, `Card`, `Input`, `Select`, `Dialog` itd.) muszą być **czyste** – bez nadpisanych stylów z legacy globals.css. M3 styling odbywa się wyłącznie przez m3.css (nadpisanie CSS vars w `.ui-m3`) oraz przez M3 wrappery dodające klasy `.m3-*`.

**Actions**:

- Create `src/app/(app)/(m3)/m3/_ui/` for M3-specific wrappers:
  - `M3Button.tsx` – wraps `Button`, adds `m3-cta` or M3 variant classes when needed.
  - `M3Card.tsx` – wraps `Card`; m3.css already overrides `[data-slot="card"]` under `.ui-m3`, so thin wrapper or re-export.
  - `M3Input.tsx`, `M3Select.tsx` – same pattern; m3.css overrides `[data-slot="input"]`, `[data-slot="select-trigger"]`.
  - `M3Dialog.tsx` – wraps Dialog; add M3 radius/shadow if not yet in m3.css.
- Create `M3FormField.tsx` – wraps `FormField` with M3 label/input styling.
- Keep logic-only reuse: `useExerciseForm`, `listExercisesService`, `ExerciseFormFields` (control structure) can be reused; swap UI primitives for M3 wrappers.

**Output artifacts**:

- `m3/_ui/M3Button.tsx`, `M3Card.tsx`, `M3Input.tsx`, `M3Select.tsx`, `M3Dialog.tsx`, `M3FormField.tsx`
- `m3/_ui/index.ts`

**Acceptance criteria**:

- M3 pages import from `m3/_ui` or `@/components/ui` (shadcn) only; no direct legacy component imports for styled elements.
- Existing tests for `ExercisesList`, `ExerciseCard` still pass when run in legacy context.

**Risk notes**:

- Wrappers add indirection; keep them thin. Avoid duplicating validation or form logic.

---

### 3) Migrate by pages/screens, not by random components (recommended order)

**Purpose**: Each step delivers a working, testable screen.

**Recommended order**:

1. **M3 Exercises list** (`/m3/exercises`) – already scaffolded; wire real data, replace mock.
2. **M3 Exercise detail** (`/m3/exercises/[id]`) – new route; reuse `getExerciseService`, `ExerciseDetails` logic.
3. **M3 Exercise new/edit** (`/m3/exercises/new`, `/m3/exercises/[id]/edit`) – reuse `ExerciseForm`, `useExerciseForm`; swap UI to M3 wrappers.
4. **M3 Home** (`/m3`) – already done; optionally refine links to M3 routes.
5. **M3 Workout plans list** (`/m3/workout-plans`) – new route; reuse `listWorkoutPlansService`, `WorkoutPlansList` logic.
6. **M3 Workout plan detail/edit** (`/m3/workout-plans/[id]`, `.../edit`) – reuse plan services and form hooks.
7. **M3 Workout sessions list** (`/m3/workout-sessions`) – reuse `listWorkoutSessionsService`.
8. **M3 Workout session detail/active** (`/m3/workout-sessions/[id]`, `.../active`) – complex; migrate after list/detail.
9. **M3 Personal records** (`/m3/personal-records`, `.../[exercise_id]`) – reuse PR services.
10. **M3 Import instruction** (`/m3/import-instruction`) – low priority.
11. **M3 Auth** (`/m3/login`, `/m3/register`, `/m3/reset-password`, `/m3/reset-password/confirm`) – layout w `.ui-m3` + m3.css w `(auth-m3)/m3/`, AuthRedirectContext dla basePath, proxy rewrite `/login` itd. → M3.

**Output artifacts**:

- New `m3/` route folders and pages.
- Updated `proxy.ts` to rewrite additional paths as M3 routes are added.

**Acceptance criteria**:

- Each migrated screen: compiles, loads data from Supabase, no mock data (except where unavoidable).
- E2E or manual test: navigate M3 route, verify data and actions.

**Risk notes**:

- Exercise new/edit forms have many fields; ensure `ExerciseFormFields` works with M3 Input/Select. Consider a phased form migration (layout first, then fields).

---

### 4) Establish a shared design contract (tokens + shadcn variables) without final brand colors

**Purpose**: M3 tokens are stable; brand colors can change later.

**Actions**:

- Document in `m3.css` or `docs/m3-tokens.md`:
  - **Stable**: `--m3-surface`, `--m3-on-surface`, `--m3-primary`, `--m3-primary-container`, `--m3-radius-*`, `--m3-shadow-*`, `--m3-font-*`.
  - **Placeholder**: `--m3-primary` currently `#e07d8a` (peach/pink); mark as “TBD – brand”.
- Ensure m3.css maps shadcn vars (`--background`, `--primary`, etc.) to M3 tokens so shadcn components work under `.ui-m3`.
- Add `@theme` or Tailwind config for M3 tokens if needed for `rounded-[var(--m3-radius-lg)]`-style utilities.

**Output artifacts**:

- `docs/m3-tokens.md` (optional)
- Comments in `m3.css` for token roles.

**Acceptance criteria**:

- Changing `--m3-primary` in m3.css updates buttons/cards across M3 without code changes.
- No hardcoded hex in M3 components; all colors from vars.

**Risk notes**:

- Dark mode tokens must stay in sync; `.ui-m3.dark` and `@media (prefers-color-scheme: dark)` already exist in m3.css.

---

### 5) Create a UI inventory and remove duplicates (map legacy UI → M3/shadcn equivalents)

**Purpose**: Avoid duplicate components and clarify migration path.

**Inventory**:

| Legacy component                     | M3/shadcn equivalent      | Action                                                                                       |
| ------------------------------------ | ------------------------- | -------------------------------------------------------------------------------------------- |
| `PageHeaderSection`                  | `PageHeader` (M3)         | Use `PageHeader` in M3; keep `PageHeaderSection` for legacy.                                 |
| `EmptyState` (shared)                | `EmptyState` (M3)         | M3 uses M3 `EmptyState`; legacy keeps shared. No merge needed.                               |
| `ExerciseCard`                       | Card + M3 styling         | Create `M3ExerciseCard` in `m3/_ui` or `m3/_components`; reuse `ExerciseDTO` and link logic. |
| `ExerciseFilters`                    | `ExercisesToolbar`        | `ExercisesToolbar` is M3; wire filters to `listExercisesService` params.                     |
| `ExerciseSort`                       | `ExercisesToolbar` Select | Same.                                                                                        |
| `AddExerciseButton`                  | Button + Link             | Use `M3Button` + `Link` in M3 pages.                                                         |
| `DeleteExerciseDialog`               | Dialog                    | Use `M3Dialog`; reuse delete logic (fetch, toast, router).                                   |
| `ExerciseForm`, `ExerciseFormFields` | Form                      | Reuse hooks; swap `Input`/`Select` for `M3Input`/`M3Select`.                                 |
| `WorkoutPlanCard`                    | Card                      | Create `M3WorkoutPlanCard`; reuse plan data shape.                                           |
| `WorkoutSessionCard`                 | Card                      | Create `M3WorkoutSessionCard`.                                                               |
| `TopNavigation`, `BottomNavigation`  | `NavigationRail`          | M3 uses `NavigationRail` only.                                                               |
| `FeatureCard`                        | `Surface` + Link          | M3 home uses `Surface`; no direct `FeatureCard` in M3.                                       |

**Actions**:

- Add `docs/m3-ui-inventory.md` with this table.
- When migrating a screen, implement the “Action” and tick off the row.

**Output artifacts**:

- `docs/m3-ui-inventory.md`

**Acceptance criteria**:

- No new legacy-style components added for M3 routes.
- Duplicates removed when legacy route is deprecated (future step).

**Risk notes**:

- `ExerciseCard` has `CardActionButtons`, `DeleteExerciseDialog`; ensure M3 version includes these.

---

### 6) Prevent CSS leaks (scoping + checks in DevTools + import rules)

**Purpose**: M3 routes must not be affected by legacy globals; legacy must not be broken by M3.

**Actions**:

- **Scoping**: Ensure all M3 page content lives inside `.ui-m3` (already in layout). Verify no M3 component renders outside that wrapper (e.g. portaled Dialogs: m3.css uses `body:has(.ui-m3)` for SelectContent; add similar for Dialog if needed).
- **DevTools check**: Add a script or doc: “In DevTools, inspect element on `/m3`; ensure no `bg-secondary`, `text-zinc-*`, `dark:bg-zinc-*` from globals. M3 elements should use `--m3-*` or `var(--m3-*)`.”
- **Import rules**: In `m3-migration.mdc`, forbid M3 routes from importing `globals.css` or legacy layout/nav components.
- **Optional**: Add `*.m3.css` or data attribute `data-m3` to M3-only styles if introducing new CSS files.

**Output artifacts**:

- `.cursor/rules/m3-migration.mdc` (import rules)
- `docs/m3-css-scoping.md` (DevTools checklist)

**Acceptance criteria**:

- Toggle design mode: legacy `/exercises` vs M3 `/m3/exercises` – no visual bleed.
- Dialog/Sheet/SelectContent in M3 use M3 tokens when opened from M3 pages.

**Risk notes**:

- Radix portals render in `body`; `body:has(.ui-m3)` works when M3 layout is mounted. If user navigates legacy→M3 or vice versa, ensure no stale portal content.

---

### 7) Animation strategy: Lenis/GSAP roadmap after layout stabilization

**Purpose**: Add smooth scroll and reveal animations only when layout is stable.

**Current state**:

- `m3/_lib/gsap.ts` – GSAP + ScrollTrigger + useGSAP registered.
- `HeroReveal`, `ScrollReveal` – used on M3 home.
- No Lenis yet.

**Actions**:

- **Phase 1 (now)**: Keep GSAP on M3 home only. Do not add to other M3 routes until layout is finalized.
- **Phase 2 (after Exercises, Plans, Sessions migrated)**: Add `ScrollReveal` to list/detail pages if desired; use `start="top 80%"` to avoid layout shift.
- **Phase 3 (optional)**: Evaluate Lenis for smooth scroll. If added, wrap M3 layout main in Lenis root; ensure ScrollTrigger `scroller` matches Lenis instance.
- **Phase 4**: Page transitions (e.g. View Transitions API) – after all screens migrated.

**Output artifacts**:

- `docs/m3-animation-roadmap.md`
- No code changes in first 3 PRs.

**Acceptance criteria**:

- Layout changes (e.g. new M3 exercises list) do not break existing GSAP on home.
- When Lenis is added, ScrollTrigger continues to work.

**Risk notes**:

- Lenis + Next.js App Router: ensure Lenis init/cleanup in client layout or page. GSAP ScrollTrigger `scroller` must point to Lenis `.lenis` element.

---

## First 3 PR Steps

### PR 1: Wire M3 Exercises list with real data + fix links

**Target route**: `/m3/exercises`

**Actions**:

1. Replace `MOCK_EXERCISES` in `m3/exercises/page.tsx` with `listExercisesService` (same as legacy).
2. Add `requireAuth` and `exerciseQuerySchema` parsing for search/sort/filters.
3. Fix links: `Link href="/exercises/new"` → `Link href="/m3/exercises/new"`; `Link href={/exercises/${ex.id}}` → `Link href={/m3/exercises/${ex.id}}`.
4. Create `m3/_ui/M3ExerciseCard.tsx` – wraps Card, uses `ExerciseDTO`, links to `/m3/exercises/[id]`, M3 typography (`m3-headline`, `m3-label`).
5. Reuse `ExercisesList` logic (empty state, grid) or inline it in the page; use `EmptyState` from `m3/_components`.
6. Wire `ExercisesToolbar` to URL params (search, sort) – either client state + `router.push` or server `searchParams`.

**Components to create**:

- `src/app/(app)/(m3)/m3/_ui/M3ExerciseCard.tsx`
- `src/app/(app)/(m3)/m3/_ui/index.ts` (barrel)

**Reuse (logic only)**:

- `listExercisesService`, `listExerciseTitlesService`
- `exerciseQuerySchema`, `ExerciseQueryParams`
- `requireAuth`

**Replace (style-coupled)**:

- Mock data → real service
- Legacy `ExerciseCard` → `M3ExerciseCard`
- Legacy `ExerciseFilters`/`ExerciseSort` → `ExercisesToolbar` (already M3)

**Minimal commits**:

1. `feat(m3): wire exercises list with real data`
2. `fix(m3): exercises links to M3 routes`
3. `feat(m3): add M3ExerciseCard`

**Definition of Done**:

- `/m3/exercises` shows real exercises from Supabase.
- Add exercise → `/m3/exercises/new`; View → `/m3/exercises/[id]`.
- Search/sort/filters work (or stub for next PR).
- `pnpm build` passes.

---

### PR 2: M3 Exercise detail page

**Target route**: `/m3/exercises/[id]`

**Actions**:

1. Create `m3/exercises/[id]/page.tsx`.
2. Use `getExerciseService` (or equivalent) to fetch exercise by id.
3. Create `m3/_components/ExerciseDetailContent.tsx` or reuse logic from `ExerciseDetails` – display title, type, part, series, reps, etc. Use M3 typography and `Surface`.
4. Add actions: Edit → `/m3/exercises/[id]/edit`, Delete → `M3DeleteExerciseDialog`.
5. Create `m3/_ui/M3DeleteExerciseDialog.tsx` – wraps Dialog, reuses delete API call and toast logic from `DeleteExerciseDialog`.

**Components to create**:

- `m3/exercises/[id]/page.tsx`
- `m3/_components/ExerciseDetailContent.tsx` (or adapt `ExerciseDetails`)
- `m3/_ui/M3DeleteExerciseDialog.tsx`

**Reuse (logic only)**:

- `getExerciseService` (or fetch from API)
- Delete API route, toast, `router.push`

**Replace (style-coupled)**:

- `ExerciseDetails` layout → M3 layout
- `DeleteExerciseDialog` → `M3DeleteExerciseDialog` (Dialog + M3 styling)

**Minimal commits**:

1. `feat(m3): add exercise detail page`
2. `feat(m3): add M3DeleteExerciseDialog`

**Definition of Done**:

- `/m3/exercises/[id]` shows exercise data.
- Edit and Delete work; Delete opens M3-styled dialog.
- `pnpm build` passes.

---

### PR 3: M3 Exercise new/edit form (layout + basic fields)

**Target route**: `/m3/exercises/new`, `/m3/exercises/[id]/edit`

**Uwaga**: `M3Input`, `M3Select`, `M3FormField` muszą opierać się na **czystych** komponentach shadcn (Input, Select, FormField) – bez legacy stylów. Stylowanie M3 wyłącznie przez m3.css i klasy `.m3-*`.

**Actions**:

1. Create `m3/exercises/new/page.tsx` and `m3/exercises/[id]/edit/page.tsx`.
2. Create `m3/_ui/M3Input.tsx`, `M3Select.tsx`, `M3FormField.tsx` – thin wrappers around `Input`, `Select`, `FormField`; rely on m3.css overrides under `.ui-m3`.
3. Create `m3/_components/ExerciseFormM3.tsx` – uses `useExerciseForm`, `ExerciseFormFields` control structure, but renders with `M3FormField`, `M3Input`, `M3Select`. Reuse `ValidationErrors`, `SaveButton`, `CancelButton` (or M3 variants).
4. Wire `onSuccess` to `router.push("/m3/exercises")`.
5. Update `proxy.ts` to rewrite `/m3/exercises/new` and `/m3/exercises/[id]/edit` if not already covered.

**Components to create**:

- `m3/exercises/new/page.tsx`, `m3/exercises/[id]/edit/page.tsx`
- `m3/_ui/M3Input.tsx`, `M3Select.tsx`, `M3FormField.tsx`
- `m3/_components/ExerciseFormM3.tsx`

**Reuse (logic only)**:

- `useExerciseForm`, `useSaveExercise`
- `ExerciseFormFields` field config (or copy and swap UI components)
- `exerciseFormSchema`, validation

**Replace (style-coupled)**:

- `Input` → `M3Input`
- `Select` → `M3Select`
- `FormField` → `M3FormField`
- `ExerciseForm` → `ExerciseFormM3`

**Minimal commits**:

1. `feat(m3): add M3 form primitives (Input, Select, FormField)`
2. `feat(m3): add exercise new/edit pages with ExerciseFormM3`
3. `fix(m3): wire form success redirect to /m3/exercises`

**Definition of Done**:

- `/m3/exercises/new` and `/m3/exercises/[id]/edit` render form.
- Submit creates/updates exercise; redirect to `/m3/exercises`.
- Validation errors display.
- `pnpm build` passes; existing exercise tests unaffected.

---

## Summary

| Step | Focus           | Key deliverables                                   |
| ---- | --------------- | -------------------------------------------------- |
| PR 1 | Exercises list  | Real data, M3ExerciseCard, correct M3 links        |
| PR 2 | Exercise detail | Detail page, M3DeleteExerciseDialog                |
| PR 3 | Exercise form   | M3 form primitives, ExerciseFormM3, new/edit pages |

After these 3 PRs, the M3 exercises flow (list → detail → new/edit) is complete and can be used to validate the migration pattern for workout plans and sessions.
