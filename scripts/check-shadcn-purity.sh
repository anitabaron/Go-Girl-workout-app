#!/usr/bin/env bash
# M3 migration: shadcn components must be clean (no legacy Tailwind classes).
# Exit 1 if legacy classes found.
# Requires: ripgrep (rg) - brew install ripgrep

command -v rg &>/dev/null || { echo "Error: ripgrep (rg) required. Install: brew install ripgrep"; exit 2; }

# Legacy patterns that must not appear in src/components/ui
LEGACY_PATTERNS="dark:|bg-secondary|text-zinc-|rounded-2xl|rounded-xl"
UI_DIR="src/components/ui/"

if rg "$LEGACY_PATTERNS" "$UI_DIR" 2>/dev/null; then
  echo "❌ Shadcn purity check failed: legacy classes found in $UI_DIR"
  echo "   Use CSS vars and m3.css overrides instead of dark:, bg-secondary, text-zinc-*, rounded-2xl"
  exit 1
fi
echo "✓ Shadcn purity check passed: no legacy classes"
