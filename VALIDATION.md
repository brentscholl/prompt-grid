# 0.1.0 release validation

Checked on the development Apple Silicon Mac on 2026-09-28:

- Seven Node regression checks pass: generic first-run cards, legacy color
  migration, color persistence, create/edit, cancel, trailing-space copying,
  escaped markup, and drag commit/cancel (some checks cover multiple behaviors).
- Swift compilation succeeds for arm64 and x86_64.
- A clean copy containing only Git-visible source files passes `npm ci` and
  `npm run release`, without relying on the original node_modules or generated CSS.
- Both executable slices report macOS 14.0, matching Info.plist.
- Ad-hoc bundle signature verifies. This is not Developer ID signing or notarization.
- ZIP contents contain only the app, bundled UI/icon, and license notices.
  The SHA-256 checksum verifies. No saved user cards are packaged.
- An isolated app identity launches with three generic starter cards.
- Native copying works without Accessibility permission and retains the trailing space.
- A new card's text and selected Teal color survive quitting and reopening the
  isolated app. The edit form shows the saved selection.
- The personal installed app and its data were not replaced during this pass.

Still requiring a release smoke check on independent hardware/account:

- Browser-downloaded/quarantined first-open flow.
- macOS 14 runtime and Intel runtime (compiled, not hardware-tested).
- Accessibility setup and automatic paste with the release build on a fresh Mac.
- Upgrade from an older build with saved cards at the same install path.

At the time of this local validation, GitHub Actions had not run and no release
had been published. Check the repository's Actions and Releases pages for current
status. Disclose these test limits in the release notes.
