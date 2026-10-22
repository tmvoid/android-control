#!/usr/bin/env bash
# ADB Device Management - respects ANDROID_SERIAL, with timeouts

set -euo pipefail

# Get device serial (respects ANDROID_SERIAL, fallback to first device)
get_device() {
  if [[ -n "${ANDROID_SERIAL:-}" ]]; then
    echo "$ANDROID_SERIAL"
  else
    adb devices | awk 'NR>1 && $2=="device" {print $1; exit}'
  fi
}

# ADB command with timeout
adb_cmd() {
  timeout 30 adb "$@" || {
    local exit_code=$?
    if [[ $exit_code -eq 124 ]]; then
      echo "ADB command timed out after 30s" >&2
    else
      echo "ADB command failed (exit $exit_code): adb $*" >&2
    fi
    return $exit_code
  }
}

# Get device model
get_model() {
  local serial="${1:-$(get_device)}"
  [[ -z "$serial" ]] && { echo "No device specified" >&2; exit 1; }
  adb_cmd -s "$serial" shell getprop ro.product.model
}

# Get Android version
get_android_version() {
  local serial="${1:-$(get_device)}"
  [[ -z "$serial" ]] && { echo "No device specified" >&2; exit 1; }
  adb_cmd -s "$serial" shell getprop ro.build.version.release
}

# Get screen resolution (handles both "Physical size: 1080x2400" and "1080x2400")
get_resolution() {
  local serial="${1:-$(get_device)}"
  [[ -z "$serial" ]] && { echo "No device specified" >&2; exit 1; }
  adb_cmd -s "$serial" shell wm size | grep -oE '[0-9]+x[0-9]+' | head -1
}

# Check if device is connected
is_connected() {
  local serial="${1:-}"
  if [[ -n "$serial" ]]; then
    adb devices | grep -q "^$serial\s\+device$"
  else
    adb devices | awk 'NR>1 && $2=="device" {found=1} END {exit found?0:1}'
  fi
}

# Wait for device with timeout
wait_for_device() {
  local timeout="${1:-30}"
  local serial="${2:-}"
  local cmd="adb"
  [[ -n "$serial" ]] && cmd+=" -s $serial"
  timeout "$timeout" $cmd wait-for-device || {
    echo "Timeout waiting for device" >&2
    return 1
  }
  sleep 2
}

# List all devices with details
list_devices() {
  adb devices -l | awk 'NR>1 {print $1 " " $2 " " substr($0, index($0,$3))}'
}

# Get device SDK version
get_sdk_version() {
  local serial="${1:-$(get_device)}"
  [[ -z "$serial" ]] && { echo "No device specified" >&2; exit 1; }
  adb_cmd -s "$serial" shell getprop ro.build.version.sdk
}

# Get device density
get_density() {
  local serial="${1:-$(get_device)}"
  [[ -z "$serial" ]] && { echo "No device specified" >&2; exit 1; }
  adb_cmd -s "$serial" shell wm density | grep -oE '[0-9]+' | head -1
}

# Main
case "${1:-}" in
  serial) get_device ;;
  model) get_model "${2:-}" ;;
  version) get_android_version "${2:-}" ;;
  sdk) get_sdk_version "${2:-}" ;;
  resolution) get_resolution "${2:-}" ;;
  density) get_density "${2:-}" ;;
  connected) is_connected "${2:-}" && echo "connected" || echo "disconnected" ;;
  wait) wait_for_device "${2:-30}" "${3:-}" ;;
  list) list_devices ;;
  *)
    echo "Usage: $0 {serial|model|version|sdk|resolution|density|connected|wait|list} [args...]"
    exit 1
    ;;
esac