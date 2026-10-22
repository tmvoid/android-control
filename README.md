# Android Visible Control

Lightweight Android automation for **human-in-the-loop** control. You type commands in OpenCode, they execute on a visible device you watch via `scrcpy`.

```
┌─────────────────────────────────────────────────────────────┐
│  OpenCode Chat                                              │
│  You: "open Instagram and like 3 posts"                    │
│  You: "fill this form and submit"                          │
│  You: "scroll TikTok until you see cats"                   │
│  You: "test the checkout flow"                             │
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

# 5. In another terminal, control any app
./mobile launch com.instagram.android
./mobile tap-text "Search"
./mobile input "cats"
./mobile tap-text "Reels"
# ... anything you want
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
./mobile launch <package> [activity]  # Launch any app
./mobile kill <package>               # Force stop
./mobile clear <package>              # Clear data
./mobile packages [filter]            # List packages
./mobile activity                     # Current foreground activity
```

## Generic Examples

### Social Media Automation
```bash
# Instagram - like posts
./mobile launch com.instagram.android
./mobile tap-text "Search"
./mobile input "nature"
./mobile tap-text "Reels"
# scroll and like...
./mobile swipe 540 1800 540 600 800

# TikTok - scroll feed
./mobile launch com.zhiliaoapp.musically
./mobile swipe 540 1800 540 600 500  # next video

# Twitter/X - post tweet
./mobile launch com.twitter.android
./mobile tap-id "com.twitter.android:id/compose_tweet"
./mobile input "Hello from mobile automation!"
./mobile tap-text "Post"
```

### Form Filling & Testing
```bash
# Fill any form
./mobile launch com.example.app
./mobile tap-id "email_field"
./mobile input "user@example.com"
./mobile tap-id "password_field"
./mobile input "securepassword123"
./mobile tap-text "Sign In"

# Test checkout flow
./mobile launch com.shop.app
./mobile tap-text "Add to Cart"
./mobile tap-text "Checkout"
./mobile tap-id "address_field"
./mobile input "123 Main St"
./mobile tap-text "Place Order"
```

### Debugging & Exploration
```bash
# See what's on screen right now
./mobile hierarchy | grep -i "button"

# Find any element by text
./mobile find-text "Continue"
./mobile find-text "Skip"
./mobile find-text "Allow"

# Find by resource-id (more precise)
./mobile find-id "btn_continue"
./mobile find-id "permission_allow_button"

# Tap whatever you found
./mobile tap-text "Continue"
./mobile tap-id "btn_continue"
```

### App Management
```bash
# Fresh start for testing
./mobile clear com.example.app
./mobile launch com.example.app

# Check what's installed
./mobile packages "google"
./mobile packages "facebook"

# See current activity
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
- **Works with ANY app** — Instagram, TikTok, Chrome, Banking, Games, etc.

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

Then in OpenCode: `/mobile launch com.instagram.android`

## Why Not Appium/MCP?

| Factor | This (ADB+scrcpy) | Appium+MCP |
|--------|-------------------|------------|
| Latency | ~50ms | ~3-5s |
| Setup | 1 min | 30+ min |
| Debugging | Watch live | Screenshot→decode→retry |
| "Tap login" | `tap-text "Login"` | XPath + JSON + wait |
| Resources | ~50MB | ~3GB |
| App support | **All apps** | All apps |

**Use Appium when:** CI testing, parallel devices, autonomous agents
**Use this when:** You want to control a device interactively for **any task**