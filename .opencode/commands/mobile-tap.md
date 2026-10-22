---
description: Tap on device screen at coordinates
argument-hint: "<x> <y>"
---
#!/usr/bin/env bash
set -euo pipefail

X="${1:-}"
Y="${2:-}"

if [[ -z "$X" || -z "$Y" ]]; then
  echo "Usage: /mobile-tap <x> <y>"
  exit 1
fi

# Call via MCP - this assumes the MCP server is running
# In practice, you'd use the OpenCode agent to call the MCP tool
echo "MCP tool call: mobile_tap {\"x\": $X, \"y\": $Y}"