---
description: Swipe on device screen
argument-hint: "<fromX> <fromY> <toX> <toY> [duration]"
---
#!/usr/bin/env bash
set -euo pipefail

FROM_X="${1:-}"
FROM_Y="${2:-}"
TO_X="${3:-}"
TO_Y="${4:-}"
DURATION="${5:-500}"

if [[ -z "$FROM_X" || -z "$FROM_Y" || -z "$TO_X" || -z "$TO_Y" ]]; then
  echo "Usage: /mobile-swipe <fromX> <fromY> <toX> <toY> [duration]"
  exit 1
fi

echo "MCP tool call: mobile_swipe {\"fromX\": $FROM_X, \"fromY\": $FROM_Y, \"toX\": $TO_X, \"toY\": $TO_Y, \"duration\": $DURATION}"