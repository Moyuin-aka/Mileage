#!/usr/bin/env bash
# set-dmg-icon.sh — embed the Mileage volume icon into a locally built DMG.
#
# ── IMPORTANT: THIS SCRIPT IS FOR LOCAL / MANUAL USE ONLY ──────────────────
#
# The CI release workflow (.github/workflows/tauri-release.yml) uses
# tauri-apps/tauri-action, which builds the DMG and uploads it to the GitHub
# Release in a single atomic step.  There is no hook between those two phases,
# so this script does NOT run in CI and does NOT affect release assets.
#
# To get the volume icon into a CI-produced release DMG you would need to
# replace the tauri-action step with manual `tauri build` → this script →
# softprops/action-gh-release upload.  That refactor is not done yet.
#
# ───────────────────────────────────────────────────────────────────────────
#
# Usage (from project root, after a local `npm run tauri build`):
#   ./scripts/set-dmg-icon.sh \
#     frontend/src-tauri/target/release/bundle/dmg/Mileage_0.3.2_aarch64.dmg
#
# The script creates a new *_with_icon.dmg alongside the original.
# Replace the original with the output file before distributing.
#
# Requirements: macOS with Xcode Command Line Tools
#   hdiutil   — ships with macOS
#   SetFile   — part of Xcode CLT; install with: xcode-select --install

set -euo pipefail

ICNS="$(cd "$(dirname "$0")/.." && pwd)/frontend/src-tauri/icons/icon.icns"
DMG="${1:-}"

if [[ -z "$DMG" ]]; then
  echo "Usage: $0 <path-to-dmg>" >&2
  exit 1
fi
if [[ ! -f "$DMG" ]]; then
  echo "DMG not found: $DMG" >&2
  exit 1
fi
if [[ ! -f "$ICNS" ]]; then
  echo "icon.icns not found at: $ICNS" >&2
  exit 1
fi
if ! command -v SetFile &>/dev/null; then
  echo "SetFile not found. Install Xcode Command Line Tools: xcode-select --install" >&2
  exit 1
fi

MOUNT_POINT=$(mktemp -d)
RW_DMG="${DMG%.dmg}_rw.dmg"
FINAL_DMG="${DMG%.dmg}_with_icon.dmg"

echo "Converting DMG to read-write copy..."
hdiutil convert "$DMG" -format UDRW -o "$RW_DMG"

echo "Mounting..."
hdiutil attach "$RW_DMG" -mountpoint "$MOUNT_POINT" -nobrowse -quiet

echo "Setting volume icon..."
cp "$ICNS" "$MOUNT_POINT/.VolumeIcon.icns"
SetFile -c icnC "$MOUNT_POINT/.VolumeIcon.icns"
SetFile -a C "$MOUNT_POINT"

echo "Detaching..."
hdiutil detach "$MOUNT_POINT" -quiet
rm -rf "$MOUNT_POINT"

echo "Compressing final DMG: $FINAL_DMG"
hdiutil convert "$RW_DMG" -format UDZO -imagekey zlib-level=9 -o "$FINAL_DMG"
rm -f "$RW_DMG"

echo "Done. Distribute: $FINAL_DMG"
