#!/bin/zsh
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"
npm test
./Scripts/build.sh
VERSION=$(/usr/libexec/PlistBuddy -c 'Print CFBundleShortVersionString' Info.plist)
ARCHIVE="Prompt-Grid-${VERSION}-macOS-universal-unsigned.zip"
# Package only the built app. WebKit's per-user prompt database is never bundled.
ditto -c -k --sequesterRsrc --keepParent "dist/Prompt Grid.app" "dist/$ARCHIVE"
cd dist
shasum -a 256 "$ARCHIVE" > "$ARCHIVE.sha256"
echo "$PROJECT_DIR/dist/$ARCHIVE"
