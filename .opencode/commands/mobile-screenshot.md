---
description: Capture device screenshot and display it
argument-hint: "[output-path]"
---
#!/usr/bin/env bash
set -euo pipefail

OUTPUT="${1:-/tmp/mobile-screenshot-$(date +%s).png}"

echo "MCP tool call: mobile_screenshot {\"path\": \"$OUTPUT\"}"