#!/usr/bin/env bash
# M3/main migration: forbid imports from removed app-local component folders.
# Exit 1 if forbidden imports found.
# Requires: ripgrep (rg) - brew install ripgrep

command -v rg &>/dev/null || { echo "Error: ripgrep (rg) required. Install: brew install ripgrep"; exit 2; }

FORBIDDEN="from ['\"][^'\"]*(_components|_ui)(/|['\"])"
M3_DIR="src/app/(app)/(main)/"

if rg "$FORBIDDEN" "$M3_DIR" 2>/dev/null; then
  echo "❌ Main import check failed: old _components/_ui imports found in $M3_DIR"
  echo "   Import from @/components or @/components/assistant instead."
  exit 1
fi
echo "✓ Main import check passed: no _components/_ui imports"
