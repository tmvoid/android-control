#!/usr/bin/env bash
# scrcpy launcher with sensible defaults - respects ANDROID_SERIAL

set -euo pipefail

# Respect ANDROID_SERIAL env var, fallback to first device
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
while [[ $# -gt 0 ]]; do
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
      echo "  --help, -h          Show this help"
      exit 0
      ;;
    --no-audio)
      OPTS+=(--no-audio)
      shift
      ;;
    --record)
      [[ -n "${2:-}" ]] || { echo "--record requires a file path" >&2; exit 1; }
      OPTS+=(--record "$2")
      shift 2
      ;;
    --crop)
      [[ -n "${2:-}" ]] || { echo "--crop requires W:H:X:Y" >&2; exit 1; }
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
      OPTS+=("$1")
      shift
      ;;
  esac
done

# Check if scrcpy is installed
command -v scrcpy >/dev/null 2>&1 || { echo "scrcpy not installed. Install: apt install scrcpy / brew install scrcpy" >&2; exit 1; }

# Launch
echo "Starting scrcpy for $SERIAL..."
exec scrcpy "${OPTS[@]}"