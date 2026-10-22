#!/usr/bin/env bash
# ADB Interaction Commands

set -euo pipefail

SERIAL="${ANDROID_SERIAL:-$(adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')}"
[[ -z "$SERIAL" ]] && { echo "No device connected" >&2; exit 1; }

adb_cmd() {
  adb -s "$SERIAL" "$@"
}

# Tap at coordinates
tap() {
  local x="${1:-}" y="${2:-}"
  [[ -z "$x" || -z "$y" ]] && { echo "Usage: tap <x> <y>" >&2; exit 1; }
  adb_cmd shell input tap "$x" "$y"
}

# Swipe from to
swipe() {
  local from_x="${1:-}" from_y="${2:-}" to_x="${3:-}" to_y="${4:-}" duration="${5:-500}"
  [[ -z "$from_x" || -z "$from_y" || -z "$to_x" || -z "$to_y" ]] && { echo "Usage: swipe <from_x> <from_y> <to_x> <to_y> [duration]" >&2; exit 1; }
  adb_cmd shell input swipe "$from_x" "$from_y" "$to_x" "$to_y" "$duration"
}

# Input text
input_text() {
  local text="${1:-}"
  [[ -z "$text" ]] && { echo "Usage: input_text <text>" >&2; exit 1; }
  # Escape special characters
  text="${text// /%s}"
  text="${text//\"/\\\"}"
  text="${text//\'/\\\'}"
  adb_cmd shell input text "$text"
}

# Key event (back, home, menu, etc.)
key() {
  local keycode="${1:-}"
  [[ -z "$keycode" ]] && { echo "Usage: key <keycode>" >&2; exit 1; }
  adb_cmd shell input keyevent "$keycode"
}

# Common keys
back() { key 4; }
home() { key 3; }
recent() { key 187; }
menu() { key 82; }
power() { key 26; }
volume_up() { key 24; }
volume_down() { key 25; }
enter() { key 66; }

# Screenshot
screenshot() {
  local path="${1:-/tmp/screenshot-$(date +%s).png}"
  adb_cmd exec-out screencap -p > "$path"
  echo "$path"
}

# Screenrecord
record_start() {
  local path="${1:-/sdcard/recording-$(date +%s).mp4}"
  local time_limit="${2:-180}"
  adb_cmd shell screenrecord --time-limit "$time_limit" "$path" &
  echo $! > /tmp/screenrecord.pid
  echo "Recording started: $path (PID: $!)"
}

record_stop() {
  local pid
  pid=$(cat /tmp/screenrecord.pid 2>/dev/null || echo "")
  [[ -n "$pid" ]] && kill -INT "$pid" 2>/dev/null
  sleep 1
  # Pull the file
  local remote_path="${1:-/sdcard/recording-$(date +%s).mp4}"
  local local_path="${2:-/tmp/recording-$(date +%s).mp4}"
  adb_cmd pull "$remote_path" "$local_path"
  echo "Recording saved to: $local_path"
}

# Dump UI hierarchy
hierarchy() {
  adb_cmd exec-out uiautomator dump /dev/tty
}

# Find element by text (simple grep on hierarchy)
find_by_text() {
  local text="${1:-}"
  [[ -z "$text" ]] && { echo "Usage: find_by_text <text>" >&2; exit 1; }
  hierarchy | grep -i "$text" | head -5
}

# Find element by resource-id
find_by_id() {
  local id="${1:-}"
  [[ -z "$id" ]] && { echo "Usage: find_by_id <resource-id>" >&2; exit 1; }
  hierarchy | grep "resource-id.*$id" | head -5
}

# Get bounds from hierarchy line (extract coordinates)
parse_bounds() {
  local line="${1:-}"
  echo "$line" | grep -oP 'bounds=\[\[?\d+,\d+\]\[\d+,\d+\]\]' | head -1 | sed 's/bounds=\[\([0-9]*\),\([0-9]*\)\]\[\([0-9]*\),\([0-9]*\)\]/\1 \2 \3 \4/'
}

# Tap element by text (find and tap center)
tap_text() {
  local text="${1:-}"
  [[ -z "$text" ]] && { echo "Usage: tap_text <text>" >&2; exit 1; }
  local line
  line=$(hierarchy | grep -i "$text" | head -1)
  [[ -z "$line" ]] && { echo "Element not found: $text" >&2; exit 1; }
  local bounds
  bounds=$(parse_bounds "$line")
  [[ -z "$bounds" ]] && { echo "Could not parse bounds" >&2; exit 1; }
  read -r x1 y1 x2 y2 <<< "$bounds"
  local cx=$(( (x1 + x2) / 2 ))
  local cy=$(( (y1 + y2) / 2 ))
  echo "Tapping '$text' at ($cx, $cy)"
  tap "$cx" "$cy"
}

# Tap element by resource-id
tap_id() {
  local id="${1:-}"
  [[ -z "$id" ]] && { echo "Usage: tap_id <resource-id>" >&2; exit 1; }
  local line
  line=$(hierarchy | grep "resource-id.*$id" | head -1)
  [[ -z "$line" ]] && { echo "Element not found: $id" >&2; exit 1; }
  local bounds
  bounds=$(parse_bounds "$line")
  [[ -z "$bounds" ]] && { echo "Could not parse bounds" >&2; exit 1; }
  read -r x1 y1 x2 y2 <<< "$bounds"
  local cx=$(( (x1 + x2) / 2 ))
  local cy=$(( (y1 + y2) / 2 ))
  echo "Tapping '$id' at ($cx, $cy)"
  tap "$cx" "$cy"
}

# Launch app by package
launch() {
  local package="${1:-}"
  local activity="${2:-}"
  [[ -z "$package" ]] && { echo "Usage: launch <package> [activity]" >&2; exit 1; }
  if [[ -n "$activity" ]]; then
    adb_cmd shell am start -n "$package/$activity"
  else
    adb_cmd shell monkey -p "$package" -c android.intent.category.LAUNCHER 1
  fi
}

# Kill app
kill_app() {
  local package="${1:-}"
  [[ -z "$package" ]] && { echo "Usage: kill_app <package>" >&2; exit 1; }
  adb_cmd shell am force-stop "$package"
}

# Clear app data
clear_app() {
  local package="${1:-}"
  [[ -z "$package" ]] && { echo "Usage: clear_app <package>" >&2; exit 1; }
  adb_cmd shell pm clear "$package"
}

# List packages
packages() {
  local filter="${1:-}"
  adb_cmd shell pm list packages | grep -i "${filter:-}" | sed 's/package://'
}

# Get current activity
current_activity() {
  adb_cmd shell dumpsys activity activities | grep -m1 "mResumedActivity" | sed 's/.* //'
}

# Main dispatch
case "${1:-}" in
  tap) tap "${2:-}" "${3:-}" ;;
  swipe) swipe "${2:-}" "${3:-}" "${4:-}" "${5:-}" "${6:-}" ;;
  input) input_text "${2:-}" ;;
  key) key "${2:-}" ;;
  back) back ;;
  home) home ;;
  recent) recent ;;
  menu) menu ;;
  power) power ;;
  volup) volume_up ;;
  voldown) volume_down ;;
  enter) enter ;;
  screenshot) screenshot "${2:-}" ;;
  record-start) record_start "${2:-}" "${3:-}" ;;
  record-stop) record_stop "${2:-}" "${3:-}" ;;
  hierarchy) hierarchy ;;
  find-text) find_by_text "${2:-}" ;;
  find-id) find_by_id "${2:-}" ;;
  tap-text) tap_text "${2:-}" ;;
  tap-id) tap_id "${2:-}" ;;
  launch) launch "${2:-}" "${3:-}" ;;
  kill) kill_app "${2:-}" ;;
  clear) clear_app "${2:-}" ;;
  packages) packages "${2:-}" ;;
  activity) current_activity ;;
  *)
    echo "Usage: $0 {tap|swipe|input|key|back|home|recent|menu|power|volup|voldown|enter|screenshot|record-start|record-stop|hierarchy|find-text|find-id|tap-text|tap-id|launch|kill|clear|packages|activity} [args...]"
    exit 1
    ;;
esac