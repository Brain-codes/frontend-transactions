#!/usr/bin/env bash
# Guard: fails if any Lovable trace reappears (e.g. after an upstream merge).
# Scans source, config, and lockfiles — catches both code references and the
# Lovable private-registry URLs that can leak back in via bun.lock. Skips deps
# and this tooling's own files.
set -uo pipefail

matches=$(grep -rniI "lovable" . \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=dist \
  --exclude-dir=.vercel \
  --exclude-dir=.tanstack \
  --exclude-dir=scripts \
  --exclude=".gitattributes" \
  2>/dev/null || true)

if [ -n "$matches" ]; then
  echo "❌ Lovable traces found (upstream merge may have reintroduced them):"
  echo "$matches"
  exit 1
fi

echo "✓ No Lovable traces found."
