# M3 Migration Backlog (Actionable)

## Enforceability

### Import boundaries

- [ ] Add `.cursor/rules/m3-migration.mdc` forbidding M3 routes from importing:
  - `@/components/layout/*`
  - `@/components/navigation/*` (TopNavigation, BottomNavigation, PageHeader)
  - `@/components/exercises/*` (ExerciseCard, ExercisesList, ExerciseFilters, ExerciseSort, AddExerciseButton, DeleteExerciseDialog)
  - `@/components/shared/empty-state` (use `m3/_components/EmptyState`)
- [ ] Allow M3 routes to import: `@/components/ui/*`, `m3/_components/*`, `m3/_ui/*`, `@/services/*`, `@/hooks/*`, `@/lib/*`, `@/types`

### Lint / grep checks

- [ ] Add `scripts/check-m3-imports.sh` (or npm script):
  - `rg "from ['\"]@/components/(layout|navigation|exercises|workout-plans|workout-sessions|personal-records|shared/empty-state)" src/app/\(app\)/\(m3\)/` → must return 0 matches
- [ ] Add `scripts/check-m3-links.sh`:
  - `rg "href=['\"]/(?!m3|login|register|reset-password|api|_next)" src/app/\(app\)/\(m3\)/` → must return 0 matches (M3 internal links must target `/m3/*`)
- [ ] Add `scripts/check-shadcn-purity.sh`:
  - `rg "dark:|bg-secondary|text-zinc-|rounded-2xl|rounded-xl" src/components/ui/` → must return 0 matches (shadcn must be clean)
- [ ] Add `pnpm check:m3` that runs all three; wire into CI or pre-commit

### Portal styling (Dialog / Popover / Sheet)

- [ ] Add to `m3.css`:
  ```css
  body:has(.ui-m3) [data-slot="dialog-content"] {
    background: var(--m3-surface-container-high) !important;
    border: 1px solid var(--m3-outline-variant) !important;
    border-radius: var(--m3-radius-large) !important;
    box-shadow: var(--m3-shadow-2) !important;
  }
  body:has(.ui-m3) [data-slot="dialog-overlay"] {
    background: rgb(0 0 0 / 0.5);
  }
  ```
- [ ] Add similar rules for `[data-slot="popover-content"]`, `[data-slot="sheet-content"]` if used in M3
- [ ] Verify Dialog/Sheet open from M3 pages render with M3 tokens (DevTools check)

### Shadcn purity audit

- [ ] Audit `src/components/ui/button.tsx`: remove `dark:bg-input/30`, `dark:border-input`, `dark:hover:bg-input/50`, `dark:aria-invalid:*`, `dark:bg-destructive/60`, `hover:scale-[1.02]`, `active:scale-[0.98]` – rely on CSS vars; m3.css overrides under `.ui-m3` handle M3
- [ ] Audit `src/components/ui/input.tsx`: remove `dark:bg-input/30`, `dark:aria-invalid:*` – use `bg-transparent` and vars only
- [ ] Audit `src/components/ui/card.tsx`, `select.tsx`, `dialog.tsx` – ensure no hardcoded legacy colors or `dark:` classes
- [ ] Document: shadcn components use only `bg-background`, `text-foreground`, `border-border`, `rounded-md` (or `var(--radius)`) – no `bg-secondary`, `text-zinc-*`, `dark:*`

---

## PR1 tasks: M3 Exercises list (real data + M3 links)

### Files to create

| File                                           | Purpose                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `src/app/(app)/(m3)/m3/_ui/M3ExerciseCard.tsx` | Card + ExerciseDTO layout, link to `/m3/exercises/[id]`, M3 typography |
| `src/app/(app)/(m3)/m3/_ui/index.ts`           | Barrel export                                                          |

### Files to edit

| File                                                     | Changes                                                                                                                                                                                                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(app)/(m3)/m3/exercises/page.tsx`               | Convert to async Server Component; add `requireAuth`, `exerciseQuerySchema` parse; call `listExercisesService`; remove MOCK_EXERCISES; fix all links to `/m3/exercises/*`; use `M3ExerciseCard`; wire `ExercisesToolbar` to `searchParams` (search, sort) |
| `src/app/(app)/(m3)/m3/_components/ExercisesToolbar.tsx` | Accept `searchParams` or controlled values; use `router.push` / `Link` to update URL (server-first: read from URL, write via navigation)                                                                                                                  |

### Simplifications (no extra wrappers)

- **M3Card**: Not needed – m3.css already styles `[data-slot="card"]` under `.ui-m3`. Use `Card` from `@/components/ui/card` directly.
- **M3Button**: Not needed for list page – use `Button` with `className="m3-cta"` for CTA; m3.css styles `[data-slot="button"]` under `.ui-m3`.

### Definition of Done (PR1)

- [ ] `/m3/exercises` is a Server Component; data from `listExercisesService(userId, parsedQuery)`
- [ ] All links: Add exercise → `/m3/exercises/new`; View → `/m3/exercises/[id]`
- [ ] Search/sort/filters update URL; page re-renders with new data (server-first)
- [ ] Empty state uses `EmptyState` from `m3/_components`
- [ ] `M3ExerciseCard` uses `Card`, `CardHeader`, `CardContent`; no legacy components
- [ ] `pnpm build` passes
- [ ] No imports from `components/exercises`, `components/layout`, `components/navigation`

---

## PR2 tasks: M3 Exercise detail page

### Files to create

| File                                                          | Purpose                                                                                               |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/app/(app)/(m3)/m3/exercises/[id]/page.tsx`               | Server Component; `getExerciseService`; render `ExerciseDetailContent`                                |
| `src/app/(app)/(m3)/m3/_components/ExerciseDetailContent.tsx` | Display exercise fields (title, type, part, series, reps, etc.); M3 typography; Edit + Delete actions |

### Files to edit

| File                                 | Changes                                                             |
| ------------------------------------ | ------------------------------------------------------------------- |
| `src/app/(app)/(m3)/m3/_ui/index.ts` | Export `M3DeleteExerciseDialog` (if created) or use Dialog directly |

### Simplifications

- **M3DeleteExerciseDialog**: Optional. m3.css does not yet style Dialog; add portal rules in Enforceability first. Then use `Dialog` from `@/components/ui/dialog` directly – it will pick up M3 vars via `body:has(.ui-m3)`. If Dialog still looks legacy, add `m3.css` portal rules in PR1/Enforceability.
- **M3Dialog wrapper**: Skip – add Dialog styling to m3.css instead.

### Definition of Done (PR2)

- [ ] `/m3/exercises/[id]` shows exercise from `getExerciseService`
- [ ] Edit link → `/m3/exercises/[id]/edit`
- [ ] Delete opens Dialog; API call, toast, `router.push("/m3/exercises")`
- [ ] Dialog uses M3 tokens (verify after portal rules added)
- [ ] `pnpm build` passes

---

## PR3 tasks: M3 Exercise new/edit form

### Files to create

| File                                                   | Purpose                                                                                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(app)/(m3)/m3/exercises/new/page.tsx`         | Server Component; render `ExerciseFormM3`                                                                                                                   |
| `src/app/(app)/(m3)/m3/exercises/[id]/edit/page.tsx`   | Server Component; fetch exercise; render `ExerciseFormM3`                                                                                                   |
| `src/app/(app)/(m3)/m3/_components/ExerciseFormM3.tsx` | Client Component; `useExerciseForm`; render fields with `Input`, `Select`, `FormField` from `@/components/ui`; `onSuccess` → `router.push("/m3/exercises")` |

### Files to edit

| File                | Changes                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| (none for wrappers) | Use `Input`, `Select`, `FormField` directly – m3.css already overrides `[data-slot="input"]`, `[data-slot="select-trigger"]` under `.ui-m3` |

### Simplifications

- **M3Input, M3Select, M3FormField**: Not needed – m3.css styles shadcn primitives. Use `Input`, `Select`, `FormField` directly. Only add `className` for layout (e.g. `className="w-full"`).
- **ExerciseFormFields**: Reuse the field config / control structure; swap to render `Input`/`Select`/`FormField` directly (or copy field definitions into `ExerciseFormM3` if `ExerciseFormFields` is tightly coupled to legacy UI).

### Definition of Done (PR3)

- [ ] `/m3/exercises/new` and `/m3/exercises/[id]/edit` render form
- [ ] Submit creates/updates via `useExerciseForm` / server action; redirect to `/m3/exercises`
- [ ] Validation errors display
- [ ] Form uses `Input`, `Select`, `FormField` from `@/components/ui`; no M3 wrappers
- [ ] `pnpm build` passes; existing tests unaffected

---

## Risks & Mitigations

### CSS leakage

| Risk                                                                     | Mitigation                                                                                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| globals.css `body`, `*:focus-visible`, `::selection` affect M3           | Accept for now; M3 layout is inside `.ui-m3`; m3.css overrides shadcn vars. If needed, scope body styles to `:root:not(.ui-m3) body` (breaking change). |
| Legacy Tailwind classes (`bg-secondary`, `text-zinc-*`) in M3 components | Enforce via grep check; M3 components use only `m3-*` and `var(--m3-*)`.                                                                                |
| shadcn has `dark:` classes that conflict with M3 dark mode               | m3.css uses `!important` to override. Long-term: remove `dark:` from shadcn; rely on `.ui-m3.dark` and CSS vars.                                        |

### Portals

| Risk                                                         | Mitigation                                                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Dialog/SelectContent/Sheet render in `body` outside `.ui-m3` | Add `body:has(.ui-m3) [data-slot="dialog-content"]` etc. in m3.css. When M3 layout is mounted, portals inherit M3 tokens. |
| Stale portal content when navigating legacy → M3             | Radix unmounts on route change. If issues: add `key={pathname}` to Dialog root to force remount.                          |
| SelectContent already has `body:has(.ui-m3)` in m3.css       | Verify; Dialog does not – add in Enforceability.                                                                          |

### Route rewrites

| Risk                                                                          | Mitigation                                                                                                |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| proxy.ts rewrites `/exercises` → `/m3/exercises`; user bookmarks `/exercises` | By design; cookie `design_mode=m3` determines rewrite. Bookmark `/m3/exercises` for direct M3 access.     |
| M3 links to `/exercises/new` break when design_mode=legacy                    | M3 routes must link to `/m3/exercises/new` only. proxy is entry switch; internal M3 nav stays on `/m3/*`. |
| proxy.ts path coverage                                                        | Already covers `/`, `/exercises`, `/exercises/*`. No change needed for PR1–PR3.                           |

### Unnecessary wrappers

| Component                      | Recommendation                                                             |
| ------------------------------ | -------------------------------------------------------------------------- |
| M3Card                         | Skip – m3.css styles `[data-slot="card"]`                                  |
| M3Input, M3Select, M3FormField | Skip – m3.css styles `[data-slot="input"]`, `[data-slot="select-trigger"]` |
| M3Button                       | Skip for most cases – use `Button` + `className="m3-cta"` when needed      |
| M3Dialog                       | Skip – add Dialog portal rules to m3.css                                   |
| M3ExerciseCard                 | Keep – domain component (exercise card layout), not a primitive wrapper    |

---

## Summary

| PR  | Focus           | Key files                                                            | Wrappers                               |
| --- | --------------- | -------------------------------------------------------------------- | -------------------------------------- |
| PR1 | Exercises list  | `exercises/page.tsx`, `M3ExerciseCard.tsx`, `ExercisesToolbar.tsx`   | M3ExerciseCard only (domain component) |
| PR2 | Exercise detail | `exercises/[id]/page.tsx`, `ExerciseDetailContent.tsx`               | None                                   |
| PR3 | Exercise form   | `exercises/new/page.tsx`, `[id]/edit/page.tsx`, `ExerciseFormM3.tsx` | None                                   |

## Workout plans (M3) – DONE

- [x] `/m3/workout-plans` – lista (real data, filter, sort, load more)
- [x] `/m3/workout-plans/[id]` – szczegóły (WorkoutPlanDetailContent)
- [x] `/m3/workout-plans/new` – nowy plan (WorkoutPlanFormM3)
- [x] `/m3/workout-plans/[id]/edit` – edycja (WorkoutPlanFormM3)
- [x] proxy.ts – rewrite `/workout-plans`, `/workout-plans/*` → M3

**Pre-PR (Enforceability)**: Add m3-migration.mdc, grep scripts, Dialog portal rules in m3.css, shadcn purity audit.
