#!/usr/bin/env bash
# Setup script for mobile automation dependencies

set -euo pipefail

echo "Installing Android automation dependencies..."

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
  if command -v apt >/dev/null 2>&1; then
    echo "Detected Debian/Ubuntu"
    sudo apt update
    sudo apt install -y android-tools-adb scrcpy
  elif command -v dnf >/dev/null 2>&1; then
    echo "Detected Fedora"
    sudo dnf install -y android-tools scrcpy
  elif command -v pacman >/dev/null 2>&1; then
    echo "Detected Arch"
    sudo pacman -S --needed android-tools scrcpy
  else
    echo "Unknown Linux distro. Please install adb and scrcpy manually."
    exit 1
  fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
  if command -v brew >/dev/null 2>&1; then
    echo "Detected macOS with Homebrew"
    brew install android-platform-tools scrcpy
  else
    echo "Please install Homebrew first: https://brew.sh"
    exit 1
  fi
else
  echo "Unsupported OS: $OSTYPE"
  exit 1
fi

# Verify installation
echo ""
echo "Verifying installation..."
adb version
scrcpy --version

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Enable USB debugging on your Android device"
echo "2. Connect device via USB"
echo "3. Run: adb devices (should show your device)"
echo "4. Run: ./mobile view (starts screen mirroring)"
echo "5. Run: ./mobile launch com.matricks (opens Matricks)"