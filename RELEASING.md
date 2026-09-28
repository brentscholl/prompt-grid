# GitHub releases

This workflow produces an ad-hoc-signed download, not an App Store submission.

## Build

Keep versions in package.json, package-lock.json, and Info.plist consistent.
Increment CFBundleVersion for each new build. Run `npm ci` and `npm run release`.
Verify both slices with `lipo -archs 'dist/Prompt Grid.app/Contents/MacOS/PromptGrid'`
and their minimum OS with `xcrun vtool -show-build 'dist/Prompt Grid.app/Contents/MacOS/PromptGrid'`.
Both should match the macOS 14.0 floor in Info.plist.
From dist, run `shasum -a 256 -c *.sha256`.

## Manual checks before publishing

Use a separate Mac user or spare Mac. Never clear a user's existing prompt data.

- Fresh install contains only generic starter cards.
- Browser-downloaded ZIP exercises Gatekeeper/quarantine and the documented
  first-open instructions with normal macOS security settings.
- Copy works without permission. After granting Accessibility, first-click
  paste into the Codex composer works without submitting.
- Create, edit, cancel, delete, change colors, drag, cancel a drag, and restart.
  Text, colors, and saved order should survive.
- Replacing the prior app in the same location preserves cards. Document any
  Accessibility refresh needed by an unsigned update.
- Check small windows, the minimum macOS version, and Intel hardware before
  advertising those combinations as runtime-tested. Compilation is not proof
  of compatibility. Codex's own supported hardware is a separate requirement.

## Publish

Review the repository, license, and release build, then commit and push to the
intended repository. Create a **release**, e.g. tag `v0.1.0`, named
**Prompt Grid 0.1.0**. Attach the ZIP and checksum from dist.
State that it is not notarized and list tested and untested OS/hardware.
Never upload WebKit data, user prompts, private screenshots, signing keys,
node_modules, or local credentials. The workflow only builds artifacts; it
does not publish automatically.

Developer ID signing/notarization may be added later to improve GitHub
installation. It does not require an App Store listing. Do not label a build
notarized unless it has completed that process. Store future signing secrets
in Keychain or GitHub Secrets, never in the repository.
