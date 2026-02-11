#!/usr/bin/env bash
# Main-only migration: forbid links/navigation to removed /legacy routes.
# Exit 1 if legacy links found.
# Requires: ripgrep (rg) - brew install ripgrep

command -v rg &>/dev/null || { echo "Error: ripgrep (rg) required. Install: brew install ripgrep"; exit 2; }

# Block /legacy references in href and client/server navigations.
LEGACY_PATHS="(href=[\"']/legacy/|redirect\\([\"']/legacy/|router\\.(push|replace)\\([\"']/legacy/)"
SCAN_DIR="src"

if rg "$LEGACY_PATHS" "$SCAN_DIR" 2>/dev/null; then
  echo "❌ Legacy links check failed: found /legacy references in $SCAN_DIR"
  echo "   Use main routes (/exercises, /workout-plans, /workout-sessions, etc.)."
  exit 1
fi
echo "✓ Legacy links check passed: no /legacy navigations"
