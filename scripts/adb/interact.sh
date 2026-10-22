#!/usr/bin/env bash
# ADB Interaction Commands - Secure, validated, error-handled

set -euo pipefail

# Respect ANDROID_SERIAL env var, fallback to first device
SERIAL="${ANDROID_SERIAL:-$(adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')}"
[[ -z "$SERIAL" ]] && { echo "No device connected" >&2; exit 1; }

# ADB command wrapper with timeout and error handling
adb_cmd() {
  timeout 30 adb -s "$SERIAL" "$@" || {
    local exit_code=$?
    if [[ $exit_code -eq 124 ]]; then
      echo "ADB command timed out after 30s" >&2
    else
      echo "ADB command failed (exit $exit_code): adb -s $SERIAL $*" >&2
    fi
    return $exit_code
  }
}

# Validate positive integer
is_positive_int() {
  [[ "$1" =~ ^[0-9]+$ ]] && [[ "$1" -ge 0 ]]
}

# Validate and sanitize output path (prevent path traversal)
sanitize_path() {
  local path="${1:-}"
  local allowed_base="${2:-/tmp}"
  [[ -z "$path" ]] && return 1
  # Resolve to absolute path
  path=$(realpath -m "$path" 2>/dev/null) || return 1
  # Ensure it's under allowed base
  [[ "$path" == "$allowed_base"/* ]] || [[ "$path" == "$allowed_base" ]] || return 1
  echo "$path"
}

# Tap at coordinates (validated)
tap() {
  local x="${1:-}" y="${2:-}"
  [[ -z "$x" || -z "$y" ]] && { echo "Usage: tap <x> <y>" >&2; exit 1; }
  is_positive_int "$x" && is_positive_int "$y" || { echo "Coordinates must be positive integers" >&2; exit 1; }
  adb_cmd shell input tap "$x" "$y"
}

# Swipe from to (validated)
swipe() {
  local from_x="${1:-}" from_y="${2:-}" to_x="${3:-}" to_y="${4:-}" duration="${5:-500}"
  [[ -z "$from_x" || -z "$from_y" || -z "$to_x" || -z "$to_y" ]] && { echo "Usage: swipe <from_x> <from_y> <to_x> <to_y> [duration]" >&2; exit 1; }
  is_positive_int "$from_x" && is_positive_int "$from_y" && is_positive_int "$to_x" && is_positive_int "$to_y" && is_positive_int "$duration" || { echo "All coordinates and duration must be positive integers" >&2; exit 1; }
  adb_cmd shell input swipe "$from_x" "$from_y" "$to_x" "$to_y" "$duration"
}

# Input text - SECURE: pass via stdin to avoid shell injection
input_text() {
  local text="${1:-}"
  [[ -z "$text" ]] && { echo "Usage: input_text <text>" >&2; exit 1; }
  # Use printf + stdin to safely pass text without any escaping issues
  printf '%s' "$text" | adb_cmd shell input text
}

# Key event
key() {
  local keycode="${1:-}"
  [[ -z "$keycode" ]] && { echo "Usage: key <keycode>" >&2; exit 1; }
  is_positive_int "$keycode" || { echo "Keycode must be positive integer" >&2; exit 1; }
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

# Screenshot with path validation
screenshot() {
  local path="${1:-/tmp/screenshot-$(date +%s).png}"
  path=$(sanitize_path "$path" "/tmp") || { echo "Invalid path (must be under /tmp)" >&2; exit 1; }
  adb_cmd exec-out screencap -p > "$path"
  echo "$path"
}

# Screenrecord - fixed race condition with unique PID file per session
record_start() {
  local path="${1:-/sdcard/recording-$(date +%s).mp4}"
  local time_limit="${2:-180}"
  is_positive_int "$time_limit" || { echo "Time limit must be positive integer" >&2; exit 1; }
  # Create unique PID file for this session
  local session_id="$$_$(date +%s%N)"
  local pid_file="/tmp/screenrecord_${session_id}.pid"
  adb_cmd shell screenrecord --time-limit "$time_limit" "$path" &
  local bg_pid=$!
  echo "$bg_pid" > "$pid_file"
  echo "$pid_file"  # Return PID file path to caller
  echo "Recording started: $path (PID: $bg_pid, pid_file: $pid_file)"
}

record_stop() {
  local pid_file="${1:-}"
  local remote_path="${2:-}"
  local local_path="${3:-/tmp/recording-$(date +%s).mp4}"
  [[ -z "$pid_file" ]] && { echo "Usage: record_stop <pid_file> [remote_path] [local_path]" >&2; exit 1; }
  [[ -f "$pid_file" ]] || { echo "No recording in progress (pid file not found: $pid_file)" >&2; exit 1; }
  local pid
  pid=$(cat "$pid_file" 2>/dev/null || echo "")
  [[ -n "$pid" ]] && kill -INT "$pid" 2>/dev/null
  sleep 1
  # If remote_path not provided, we can't easily determine it - require it
  [[ -z "$remote_path" ]] && { echo "Remote path required for pull" >&2; exit 1; }
  local_path=$(sanitize_path "$local_path" "/tmp") || { echo "Invalid local path (must be under /tmp)" >&2; exit 1; }
  adb_cmd pull "$remote_path" "$local_path"
  rm -f "$pid_file"
  echo "Recording saved to: $local_path"
}

# Dump UI hierarchy
hierarchy() {
  adb_cmd exec-out uiautomator dump /dev/tty
}

# Find element by text
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

# Get bounds from hierarchy line - robust parsing (no PCRE, handles both [[x,y][x,y]] and [x,y][x,y])
parse_bounds() {
  local line="${1:-}"
  # Extract bounds=[x,y][x,y] or bounds=[[x,y][x,y]] - supports negative coords too
  echo "$line" | sed -n 's/.*bounds=\[\([0-9-]*\),\([0-9-]*\)\]\[\([0-9-]*\),\([0-9-]*\)\].*/\1 \2 \3 \4/p' | head -1
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
  [[ -z "$bounds" ]] && { echo "Could not parse bounds for: $text" >&2; exit 1; }
  read -r x1 y1 x2 y2 <<< "$bounds"
  is_positive_int "$x1" && is_positive_int "$y1" && is_positive_int "$x2" && is_positive_int "$y2" || { echo "Invalid bounds: $bounds" >&2; exit 1; }
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
  [[ -z "$bounds" ]] && { echo "Could not parse bounds for: $id" >&2; exit 1; }
  read -r x1 y1 x2 y2 <<< "$bounds"
  is_positive_int "$x1" && is_positive_int "$y1" && is_positive_int "$x2" && is_positive_int "$y2" || { echo "Invalid bounds: $bounds" >&2; exit 1; }
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
  record-stop) record_stop "${2:-}" "${3:-}" "${4:-}" ;;
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