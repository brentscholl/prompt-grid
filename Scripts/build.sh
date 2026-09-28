#!/bin/zsh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="Prompt Grid"
EXECUTABLE_NAME="PromptGrid"
BUILD_DIR="$PROJECT_DIR/build"
DIST_DIR="$PROJECT_DIR/dist"
APP_DIR="$DIST_DIR/$APP_NAME.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"
# Match Info.plist rather than inheriting the build host's OS version.
MIN_MACOS=$(/usr/libexec/PlistBuddy -c 'Print LSMinimumSystemVersion' "$PROJECT_DIR/Info.plist")
SDK_PATH=$(xcrun --sdk macosx --show-sdk-path)

cd "$PROJECT_DIR"

./node_modules/.bin/tailwindcss -i "$PROJECT_DIR/Web/input.css" -o "$PROJECT_DIR/Web/output.css" --minify

mkdir -p "$BUILD_DIR" "$DIST_DIR"
rm -rf "$APP_DIR"
mkdir -p "$MACOS_DIR" "$RESOURCES_DIR/Web"

for ARCH in arm64 x86_64; do
  xcrun swiftc \
    "$PROJECT_DIR/Sources/PromptGrid/main.swift" \
    -sdk "$SDK_PATH" -target "${ARCH}-apple-macosx${MIN_MACOS}" \
    -O -framework ApplicationServices -framework Cocoa -framework WebKit \
    -o "$BUILD_DIR/$EXECUTABLE_NAME-$ARCH"
done
xcrun lipo -create "$BUILD_DIR/$EXECUTABLE_NAME-arm64" "$BUILD_DIR/$EXECUTABLE_NAME-x86_64" \
  -output "$MACOS_DIR/$EXECUTABLE_NAME"

cp "$PROJECT_DIR/Info.plist" "$CONTENTS_DIR/Info.plist"
cp "$PROJECT_DIR/Web/index.html" "$RESOURCES_DIR/Web/index.html"
cp "$PROJECT_DIR/Web/app.js" "$RESOURCES_DIR/Web/app.js"
cp "$PROJECT_DIR/Web/output.css" "$RESOURCES_DIR/Web/output.css"
cp "$PROJECT_DIR/Assets/AppIcon.icns" "$RESOURCES_DIR/AppIcon.icns"
cp "$PROJECT_DIR/LICENSE" "$RESOURCES_DIR/LICENSE"
cp "$PROJECT_DIR/THIRD_PARTY_NOTICES.md" "$RESOURCES_DIR/THIRD_PARTY_NOTICES.md"

plutil -lint "$CONTENTS_DIR/Info.plist"
codesign --force --deep --sign - "$APP_DIR"
codesign --verify --deep --strict "$APP_DIR"

echo "$APP_DIR"
