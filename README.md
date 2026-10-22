# Mobile Automation MCP Server

Model Context Protocol (MCP) server for Android mobile automation via Appium. Exposes device control as tools and resources that any MCP-compatible client (OpenCode, Claude Code, etc.) can use.

## Architecture

```
┌─────────────────┐     MCP (stdio)      ┌──────────────────┐
│   OpenCode      │ ◄──────────────────► │  MCP Server      │
│   Agents        │   Tools & Resources  │  (this project)  │
└─────────────────┘                      └────────┬─────────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    │       Appium Server         │
                                    │       (port 4723)           │
                                    │    UIAutomator2 Driver      │
                                    └──────────────┬──────────────┘
                                                   │
                                    ┌──────────────┴──────────────┐
                                    │     Android Device/Emulator │
                                    │        (ADB + USB)          │
                                    └─────────────────────────────┘
```

## Features

### Tools (Actions)
| Tool | Description |
|------|-------------|
| `mobile_tap` | Tap at screen coordinates |
| `mobile_swipe` | Swipe from point to point |
| `mobile_input_text` | Type text into focused/specified element |
| `mobile_screenshot` | Capture screenshot (returns base64 + saves file) |
| `mobile_dump_hierarchy` | Get current UI hierarchy as XML |
| `mobile_find_element` | Find element by id, xpath, accessibility, class, css |
| `mobile_install_app` | Install APK |
| `mobile_launch_app` | Launch app by package/activity |
| `mobile_adb_shell` | Execute arbitrary ADB shell command |
| `mobile_start_recording` | Start screen recording |
| `mobile_stop_recording` | Stop recording, pull file |
| `mobile_press_key` | Press hardware key (back, home, menu, etc.) |
| `mobile_get_device_info` | Get device model, Android version, screen size, etc. |
| `mobile_list_packages` | List installed packages |
| `mobile_get_logcat` | Get logcat output |

### Resources (State)
| Resource | Description |
|----------|-------------|
| `mobile://device/info` | Device info as JSON |
| `mobile://screen/current` | Current screenshot as PNG |
| `mobile://hierarchy/current` | Current UI hierarchy as XML |
| `mobile://logcat` | Recent logcat |
| `mobile://packages` | Installed packages list |

## Quick Start

### Prerequisites
- Node.js 22+
- Android device/emulator with USB debugging enabled
- Appium 2.x installed globally: `npm install -g appium && appium driver install uiautomator2`

### Local Development

```bash
# Clone and install
git clone <this-repo>
cd mobile-automation
npm install

# Start Appium server (in separate terminal)
appium --port 4723

# Configure device (optional, defaults to emulator-5554)
export ANDROID_UDID=<your-device-serial>
export ANDROID_DEVICE=emulator-5554

# Run MCP server
npm run dev
```

### Docker (Recommended)

```bash
# Start everything (Appium + MCP server)
docker-compose up -d

# Or with emulator
docker-compose --profile emulator up -d
```

### OpenCode Integration

Add to your `.opencode/mcp.json`:

```json
{
  "mcpServers": {
    "mobile-automation": {
      "command": "node",
      "args": ["/path/to/mobile-automation/dist/index.js"],
      "env": {
        "APPIUM_HOST": "localhost",
        "APPIUM_PORT": "4723",
        "ANDROID_UDID": "your-device-serial"
      }
    }
  }
}
```

Or if using Docker:

```json
{
  "mcpServers": {
    "mobile-automation": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "--network=host", "mobile-automation-mcp:latest"],
      "env": {
        "APPIUM_HOST": "localhost",
        "APPIUM_PORT": "4723"
      }
    }
  }
}
```

## Usage Examples

### In OpenCode Agent
```
> Take a screenshot of the current screen
> Tap the login button at coordinates (540, 1200)
> Swipe up to scroll the feed
> Input text "hello world" into the search field
> Dump the UI hierarchy and find all clickable elements
> Start recording, perform some actions, stop recording
```

### Direct Tool Calls
```json
// Tap
{"name": "mobile_tap", "arguments": {"x": 540, "y": 1200}}

// Swipe
{"name": "mobile_swipe", "arguments": {"fromX": 540, "fromY": 1800, "toX": 540, "toY": 600, "duration": 800}}

// Find element by accessibility ID
{"name": "mobile_find_element", "arguments": {"strategy": "accessibility", "value": "login-button"}}

// Install and launch app
{"name": "mobile_install_app", "arguments": {"apkPath": "/path/to/app.apk"}}
{"name": "mobile_launch_app", "arguments": {"packageName": "com.example.app"}}
```

## Keycodes Reference

| Key | Keycode |
|-----|---------|
| Back | 4 |
| Home | 3 |
| Menu | 82 |
| Power | 26 |
| Volume Up | 24 |
| Volume Down | 25 |
| Enter | 66 |
| Search | 84 |
| Recent Apps | 187 |

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `APPIUM_HOST` | `localhost` | Appium server host |
| `APPIUM_PORT` | `4723` | Appium server port |
| `ANDROID_DEVICE` | `emulator-5554` | Device name for capabilities |
| `ANDROID_UDID` | - | Specific device UDID (optional) |

## Project Structure

```
mobile-automation/
├── src/
│   ├── index.ts           # MCP server entry point
│   └── mobile-automation.ts  # Core automation logic
├── appium.config.json     # Appium configuration
├── docker-compose.yml     # Docker services
├── Dockerfile             # Container image
├── package.json
├── tsconfig.json
└── .github/workflows/ci.yml
```

## Development

```bash
# Install deps
npm install

# Type-check
npx tsc --noEmit

# Lint
npm run lint

# Test
npm test

# Build
npm run build

# Run dev with hot reload
npm run dev
```

## Troubleshooting

### Device not found
```bash
adb devices
# Ensure your device appears and is authorized
```

### Appium session fails
```bash
# Check Appium logs
appium --log-level debug

# Verify UIAutomator2 driver
appium driver list
```

### Permission denied on USB
```bash
# On Linux, add udev rules or run with --privileged in Docker
sudo usermod -aG plugdev $USER
```

## License

MIT