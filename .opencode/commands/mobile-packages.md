---
description: List installed packages
argument-hint: "[filter]"
---
#!/usr/bin/env bash
set -euo pipefail

FILTER="${1:-}"

if [[ -n "$FILTER" ]]; then
  echo "MCP tool call: mobile_list_packages {\"filter\": \"$FILTER\"}"
else
  echo "MCP tool call: mobile_list_packages {}"
fi