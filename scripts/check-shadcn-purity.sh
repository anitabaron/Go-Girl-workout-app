#!/usr/bin/env bash
# Main-only migration: shadcn primitives must avoid old hard-coded zinc palette.
# Exit 1 if hard-coded legacy palette classes are found.
# Requires: ripgrep (rg) - brew install ripgrep

command -v rg &>/dev/null || { echo "Error: ripgrep (rg) required. Install: brew install ripgrep"; exit 2; }

# Hard-coded legacy color patterns that should not appear in src/components/ui
LEGACY_PATTERNS="text-zinc-"
UI_DIR="src/components/ui/"

if rg "$LEGACY_PATTERNS" "$UI_DIR" 2>/dev/null; then
  echo "❌ Shadcn purity check failed: hard-coded zinc classes found in $UI_DIR"
  echo "   Use semantic tokens (text-foreground, text-muted-foreground, etc.) instead of text-zinc-*."
  exit 1
fi
echo "✓ Shadcn purity check passed: no hard-coded zinc palette"
