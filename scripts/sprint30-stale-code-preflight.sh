#!/usr/bin/env bash
# sprint30-stale-code-preflight.sh
# Fails if any active-runtime symbols from the legacy waiter session-ordering model are found.
# References in historical planning files (project_management/, docs/, tmp-issues.md) are allowed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

STALE_SYMBOLS=(
  "WaiterAssistedOrder"
  "WaiterAssistedOrderRequest"
  "WaiterAssistedOrderResponse"
  "WaiterAssistedOrderItemInput"
  "placeWaiterAssistedOrder"
  "loadWaiterCreateOrderData"
  "resolveWaiterCreateOrderTableSession"
  "loadWaiterOrderingParticipant"
)

# Directories and files to exclude (historical planning, docs, non-runtime)
EXCLUDE_ARGS=(
  --exclude-dir=.git
  --exclude-dir=node_modules
  --exclude-dir=dist
  --exclude-dir=project_management
  --exclude-dir=docs
  --exclude-dir=e2e
  --exclude="tmp-issues.md"
  --exclude="*.lock"
  --exclude="*.sum"
  --exclude="AGENTS.md"
  --exclude="sprint30-stale-code-preflight.sh"
)

FOUND=0

for symbol in "${STALE_SYMBOLS[@]}"; do
  MATCHES=$(rg --fixed-strings --files-with-matches "${EXCLUDE_ARGS[@]}" "$symbol" "$REPO_ROOT" 2>/dev/null || true)
  if [ -n "$MATCHES" ]; then
    echo "FAIL: stale symbol '$symbol' found in active runtime code:"
    echo "$MATCHES" | while read -r file; do
      LINE=$(rg --fixed-strings --line-number "$symbol" "$file" 2>/dev/null | head -1)
      echo "  $file:$LINE"
    done
    FOUND=1
  fi
done

if [ "$FOUND" -eq 1 ]; then
  echo ""
  echo "Stale-code preflight FAILED. Remove the legacy waiter session-ordering symbols above."
  exit 1
fi

echo "Stale-code preflight PASSED. No legacy waiter session-ordering symbols found."
exit 0
