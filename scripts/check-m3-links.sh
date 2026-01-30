#!/usr/bin/env bash
# M3 migration: M3 internal links must target /m3/* (not legacy paths).
# Exit 1 if legacy links found.
# Requires: ripgrep (rg) - brew install ripgrep

command -v rg &>/dev/null || { echo "Error: ripgrep (rg) required. Install: brew install ripgrep"; exit 2; }

# Legacy paths that must not be linked from M3 (use /m3/* instead)
LEGACY_PATHS="href=[\"']/(exercises|workout-plans|workout-sessions|personal-records|import-instruction|kitchen-sink|test)(/|[\"'])"
M3_DIR="src/app/(app)/(m3)/"

if rg "$LEGACY_PATHS" "$M3_DIR" 2>/dev/null; then
  echo "❌ M3 links check failed: legacy links found in $M3_DIR"
  echo "   M3 internal links must target /m3/* (e.g. /m3/exercises/new)"
  exit 1
fi
echo "✓ M3 links check passed: no legacy links"
