---
description: Launch an app by package name
argument-hint: "<package-name> [activity]"
---
#!/usr/bin/env bash
set -euo pipefail

PACKAGE="${1:-}"
ACTIVITY="${2:-}"

if [[ -z "$PACKAGE" ]]; then
  echo "Usage: /mobile-launch <package-name> [activity]"
  exit 1
fi

if [[ -n "$ACTIVITY" ]]; then
  echo "MCP tool call: mobile_launch_app {\"packageName\": \"$PACKAGE\", \"activity\": \"$ACTIVITY\"}"
else
  echo "MCP tool call: mobile_launch_app {\"packageName\": \"$PACKAGE\"}"
fi