#!/usr/bin/env bash
# M3 migration: forbid legacy component imports in M3 routes.
# Exit 1 if forbidden imports found.
# Requires: ripgrep (rg) - brew install ripgrep

command -v rg &>/dev/null || { echo "Error: ripgrep (rg) required. Install: brew install ripgrep"; exit 2; }

FORBIDDEN="from ['\"]@/components/(layout|navigation|exercises|workout-plans|workout-sessions|personal-records|shared/empty-state)"
M3_DIR="src/app/(app)/(m3)/"

if rg "$FORBIDDEN" "$M3_DIR" 2>/dev/null; then
  echo "❌ M3 import check failed: forbidden imports found in $M3_DIR"
  echo "   M3 routes must not import from @/components/layout, navigation, exercises, etc."
  exit 1
fi
echo "✓ M3 import check passed: no forbidden imports"
