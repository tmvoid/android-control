# Android Visible Control

Lightweight Android automation for **human-in-the-loop** control. You type commands in OpenCode, they execute on a visible device you watch via `scrcpy`.

```
┌─────────────────────────────────────────────────────────────┐
│  OpenCode Chat                                              │
│  You: "open Matricks and do daily challenge"               │
│  Agent: [runs commands, you watch live]                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
           ┌──────────────┴──────────────┐
           ▼                             ▼
    ┌─────────────┐               ┌─────────────┐
    │  ADB Cmds   │               │  scrcpy     │
    │  (tap,      │               │  (60fps     │
    │   swipe,    │               │   mirror)   │
    │   input)    │               └─────────────┘
    └─────────────┘
```

## Quick Start

```bash
# 1. Install dependencies (Linux/macOS)
./setup.sh

# 2. Enable USB debugging on device, connect via USB
# 3. Verify connection
adb devices

# 4. Start screen mirroring (opens window on your desktop)
./mobile view

# 5. In another terminal, control the device
./mobile launch com.matricks
./mobile tap-text "Daily Challenge"
./mobile swipe 540 1800 540 600
```

## Commands

### Device
```bash
./mobile device serial          # Get device serial
./mobile device model           # Get device model
./mobile device resolution      # Get screen resolution (e.g., 1080x2400)
./mobile device list            # List all connected devices
```

### Screen Mirroring (scrcpy)
```bash
./mobile view                   # Start mirroring
./mobile view --no-audio        # Without audio
./mobile view --record out.mp4  # Record while mirroring
./mobile view --fullscreen      # Fullscreen mode
```

### Interaction
```bash
./mobile tap <x> <y>                    # Tap coordinates
./mobile swipe <x1> <y1> <x2> <y2> [ms] # Swipe (default 500ms)
./mobile input "text here"              # Type text
./mobile back                           # Back button
./mobile home                           # Home button
./mobile recent                         # Recent apps
./mobile key <keycode>                  # Any keycode (3=home, 4=back, 66=enter, etc.)
```

### Screen Capture
```bash
./mobile screenshot [path]          # Save screenshot (default /tmp/screenshot-TIME.png)
./mobile record-start [path] [sec]  # Start recording (default 180s)
./mobile record-stop [remote] [local]  # Stop & pull recording
```

### UI Inspection (via UIAutomator)
```bash
./mobile hierarchy                  # Dump full UI XML
./mobile find-text "login"          # Find elements containing text
./mobile find-id "btn_login"        # Find by resource-id
./mobile tap-text "Login"           # Find by text AND tap center
./mobile tap-id "btn_login"         # Find by id AND tap center
```

### Apps
```bash
./mobile launch <package> [activity]  # Launch app
./mobile kill <package>               # Force stop
./mobile clear <package>              # Clear data
./mobile packages [filter]            # List packages
./mobile activity                     # Current foreground activity
```

## Examples

### Matricks Daily Challenge
```bash
# Start mirroring (keep this running)
./mobile view

# In another terminal:
./mobile launch com.matricks
# Wait for app to load...
./mobile tap-text "Daily Challenge"
# Solve puzzle...
./mobile swipe 540 1800 540 600 800  # Swipe up slowly
./mobile tap 540 1200                # Tap specific coordinate
```

### Generic Flow
```bash
# 1. See what's on screen
./mobile hierarchy | grep -i "button"

# 2. Tap by text
./mobile tap-text "Continue"

# 3. Input text
./mobile input "my password"

# 4. Tap login button
./mobile tap-id "btn_login"

# 5. Verify success
./mobile activity
```

## Keycodes Reference

| Key | Keycode |
|-----|---------|
| Back | 4 |
| Home | 3 |
| Recent Apps | 187 |
| Menu | 82 |
| Power | 26 |
| Volume Up | 24 |
| Volume Down | 25 |
| Enter | 66 |
| Search | 84 |
| Camera | 27 |

## Architecture

```
mobile                 # Main entry point (dispatches to sub-scripts)
├── scripts/
│   ├── adb/
│   │   ├── device.sh      # Device info queries
│   │   └── interact.sh    # All interaction commands
│   └── scrcpy/
│       └── launch.sh      # scrcpy wrapper with defaults
└── setup.sh               # Dependency installer
```

- **No Appium, no MCP server, no Docker** — just ADB + scrcpy
- **Sub-100ms latency** — direct ADB commands
- **Visible by default** — scrcpy shows live device screen
- **Natural language friendly** — `tap-text "Login"` vs coordinates

## Requirements

- Android device with USB debugging enabled
- `adb` (Android Platform Tools)
- `scrcpy` (screen mirroring)
- Linux/macOS (Windows works via WSL2)

## OpenCode Integration

Add to `.opencode/commands/mobile.md`:
```markdown
---
description: Control Android device
argument-hint: "<command> [args...]"
---
#!/usr/bin/env bash
/path/to/mobile-automation/mobile "$@"
```

Then in OpenCode: `/mobile launch com.matricks`

## Why Not Appium/MCP?

| Factor | This (ADB+scrcpy) | Appium+MCP |
|--------|-------------------|------------|
| Latency | ~50ms | ~3-5s |
| Setup | 1 min | 30+ min |
| Debugging | Watch live | Screenshot→decode→retry |
| "Tap login" | `tap-text "Login"` | XPath + JSON + wait |
| Resources | ~50MB | ~3GB |

**Use Appium when:** CI testing, parallel devices, autonomous agents
**Use this when:** You want to control a device interactively