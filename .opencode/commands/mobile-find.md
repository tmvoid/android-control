---
description: Find element on screen by various strategies
argument-hint: "<strategy> <value> [timeout]"
---
#!/usr/bin/env bash
set -euo pipefail

STRATEGY="${1:-}"
VALUE="${2:-}"
TIMEOUT="${3:-5000}"

if [[ -z "$STRATEGY" || -z "$VALUE" ]]; then
  echo "Usage: /mobile-find <strategy> <value> [timeout]"
  echo "Strategies: id, xpath, accessibility, class, css"
  exit 1
fi

echo "MCP tool call: mobile_find_element {\"strategy\": \"$STRATEGY\", \"value\": \"$VALUE\", \"timeout\": $TIMEOUT}"