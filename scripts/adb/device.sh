#!/usr/bin/env bash
# ADB Device Management

set -euo pipefail

# Get device serial (first connected device)
get_device() {
  adb devices | awk 'NR>1 && $2=="device" {print $1; exit}'
}

# Get device model
get_model() {
  local serial="${1:-$(get_device)}"
  adb -s "$serial" shell getprop ro.product.model
}

# Get Android version
get_android_version() {
  local serial="${1:-$(get_device)}"
  adb -s "$serial" shell getprop ro.build.version.release
}

# Get screen resolution
get_resolution() {
  local serial="${1:-$(get_device)}"
  adb -s "$serial" shell wm size | grep -oP '\d+x\d+'
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

# Wait for device
wait_for_device() {
  local timeout="${1:-30}"
  local serial="${2:-}"
  local cmd="adb"
  [[ -n "$serial" ]] && cmd+=" -s $serial"
  $cmd wait-for-device
  sleep 2
}

# List all devices
list_devices() {
  adb devices -l | awk 'NR>1 {print $1 " " $2 " " substr($0, index($0,$3))}'
}

# Main
case "${1:-}" in
  serial) get_device ;;
  model) get_model "${2:-}" ;;
  version) get_android_version "${2:-}" ;;
  resolution) get_resolution "${2:-}" ;;
  connected) is_connected "${2:-}" && echo "connected" || echo "disconnected" ;;
  wait) wait_for_device "${2:-30}" "${3:-}" ;;
  list) list_devices ;;
  *)
    echo "Usage: $0 {serial|model|version|resolution|connected|wait|list} [args...]"
    exit 1
    ;;
esac