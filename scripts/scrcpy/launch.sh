#!/usr/bin/env bash
# scrcpy launcher with sensible defaults

set -euo pipefail

SERIAL="${ANDROID_SERIAL:-$(adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')}"
[[ -z "$SERIAL" ]] && { echo "No device connected" >&2; exit 1; }

# Default options
OPTS=(
  --serial "$SERIAL"
  --max-fps 60
  --video-bit-rate 8M
  --audio-bit-rate 128K
  --stay-awake
  --show-touches
  --window-title "Android: $SERIAL"
)

# Parse args
case "${1:-}" in
  --help|-h)
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --no-audio          Disable audio"
    echo "  --record <file>     Record to file"
    echo "  --crop <W:H:X:Y>    Crop video"
    echo "  --fullscreen        Start fullscreen"
    echo "  --always-on-top     Keep window on top"
    echo "  --no-control        View only (no input)"
    echo "  --help              Show this help"
    exit 0
    ;;
  --no-audio)
    OPTS+=(--no-audio)
    shift
    ;;
  --record)
    OPTS+=(--record "$2")
    shift 2
    ;;
  --crop)
    OPTS+=(--crop "$2")
    shift 2
    ;;
  --fullscreen)
    OPTS+=(--fullscreen)
    shift
    ;;
  --always-on-top)
    OPTS+=(--always-on-top)
    shift
    ;;
  --no-control)
    OPTS+=(--no-control)
    shift
    ;;
  *)
    # Pass through any other args
    OPTS+=("$@")
    ;;
esac

# Check if scrcpy is installed
command -v scrcpy >/dev/null 2>&1 || { echo "scrcpy not installed. Install: apt install scrcpy / brew install scrcpy" >&2; exit 1; }

# Launch
echo "Starting scrcpy for $SERIAL..."
exec scrcpy "${OPTS[@]}"