# M3 Migration Resume (2026-02-11)

## Branch context

- Active branch for this stream: `codex/remove-legacy-main-only`
- Focus: CSS migration hardening + decoupling from legacy scope mechanics

## What was completed

1. M3 stylesheet architecture was modularized.
2. Global stylesheet architecture was modularized.
3. Dark-mode precedence in globals and M3 was cleaned up.
4. Portal style duplication was reduced and token behavior aligned with core M3.
5. Token layer migration started:
   - base M3 tokens moved to `:root`,
   - M3 mode selectors moved to `:root.dark/:root.light`,
   - theme store now sets mode classes on `document.documentElement`.
6. Portal selectors no longer depend on `body:has(.ui-m3)`.
7. i18n fixes done in parallel:
   - personal-record sort labels localized,
   - estimated-set-time labels localized in exercise/plan flows.

## Current technical state

- `.ui-m3` dependency is removed from active source selectors and layout wrappers.
- Theme/tokens already work from `:root` and `:root.dark/:root.light`.
- Portal styles are globally addressable from `body`.

## Next steps (recommended order)

1. Run visual smoke checks (light/dark):
   - exercises list/new/edit/detail
   - workout plans list/new/edit/detail
   - personal records list/detail
   - dialog/sheet/select portal surfaces
2. If visual regressions appear, patch component-level selectors, not root token mappings.

## Guardrails for continuation

- Keep commits small and reversible.
- Prefer mechanical selector/token refactors before visual tweaks.
- Run `pnpm -s type-check` and `pnpm -s lint` after each step.
