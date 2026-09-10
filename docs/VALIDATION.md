# Validation — Wrist Compare 0.1.0

Run date: 2026-09-10. Node v22.23.2, npm 12.0.2, aiot-toolkit 2.0.5, Linux. This is a new app; Wrist Calc's reported hardware success is only the engineering reference.

## Completed

- `npm install --no-audit --no-fund`: completed; generated a retained package-lock.json.
- `npm test`: **27 passed, zero failed**. See `node-test-output.txt` for exact cases, including deterministic arithmetic/state checks, storage failures/delays and capsule/hit-target bounds.
- `npm run preview` and `npm run preflight`: passed. Preview embeds the exact current shared/core/preference source. Native rendering has one click binding per control.
- Chromium through Playwright CLI: **19 screen checks**, no text-bound failures or page-script errors; included native-size/mobile and 2× screenshots. Tested real taps, navigation, and relevant keyboard interactions. See `browser-validation.json` and the reproducible `scripts/check-preview.js`.
- Additional boundary-layout scenarios: **12**, no failures; see `layout-extremes.json`.
- `npm run build` and `npm run release`: both passed after the final runtime-source changes. See `build-output.txt` and `release-output.txt`.
- A distinct local signing pair was generated once with the non-overwriting helper. Release contains the matching public certificate. ZIP integrity passed; packaged identity/version/features match the manifest, and no private signing files are packaged.

## Fresh release

`/home/roig/prj/wrist-suite/wrist-compare/dist/org.roig.wristcompare.release.0.1.0.rpk`

Package `org.roig.wristcompare`, version `0.1.0`, versionCode `1`; 12347 bytes.

SHA-256: `e918772351567d05c9dc31dc36f645e0d108d425b076fa7733703997e6d83a6b`

Compiled at `2026-09-10T15:10:44.942Z`. Full artifact metadata: `artifact-validation.json`.

## Remaining messages

The pinned toolkit's dependency installation reports upstream deprecations (including jsrsasign, glob, eslint and koa-router). npm also blocked install hooks for `protobufjs` and `@parcel/watcher` under its existing install-script policy. Those hooks were not enabled; compilation and release nevertheless succeeded. The complete messages are preserved in `install-output.txt`. No dependency modernization or warning suppression was performed.

The toolkit prints its temporary staging path while packaging, then moves the result into the actual `dist/` path above. It also recommends AIoT-IDE after successful compilation. No unsupported-style or native compilation errors were reported.

## Still to verify on a physical band

No app was installed on hardware, and no physical touch/font/gesture/storage/suspend-resume/power validation was performed. The browser is not a Vela emulator.

Enter the 4/500 g versus 5.5/750 g example, verify B wins while A has the smaller total price, edit each field, cancel edits, change dimension, switch bases and confirm/cancel Reset. Check whole items and US fl oz labels.

For every app, check capsule-edge visibility, comfortable touches, Back/Cancel behavior, the native exit gesture, and preference restoration after closing/reopening. Report the app version, band firmware, expected/actual behavior and exact taps; omit signing keys and Bluetooth secrets.

Back up `sign/private.pem` and `sign/certificate.pem` privately and retain this pair for this app's updates.
