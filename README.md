# Wrist Compare

A standalone offline English utility for the ordinary **Xiaomi Smart Band 10**, with a 212 × 520 capsule layout matching Wrist Calc.

**Version:** `0.1.0` · **Version code:** `1` · **Package:** `org.roig.wristcompare`

Compare exactly two packages' **total package prices divided by total net quantities**, using the **same currency** for A and B. Include taxes/fees consistently in both entered prices. No currency symbol or exchange-rate conversion is applied.

Choose Mass (g, kg, oz, lb), Volume (mL, L, US fl oz), or Count (whole items). Tap any of the four fields to edit it independently. For quantities, **Unit** opens a selector while keeping the draft. Enter the total quantity in this package—for example 6 items or the total grams across a multipack. There is no multipack subform or grams-to-mL conversion.

**Compare** shows the better price per unit, both normalized rates and the percentage cheaper than the other package. Tap the basis to switch per kg/per 100 g or per L/per 100 mL. Count uses per item. **Package totals** retains each package's purchase price and quantity; a lower unit price does not necessarily mean less cash to buy today.

The comparison uses unrounded canonical quantities in g, mL or items. Equality tolerance is `abs(rateA-rateB) <= 1e-12 * max(rateA,rateB)` with no absolute floor. Changing the displayed basis cannot change the winner. If distinct rates format alike, a small-difference note and nonzero percentage distinguish them. Savings means `100 * (higherRate-lowerRate) / higherRate`.

Zero prices are allowed, quantities must be positive, and item counts must be integers. One free package is 100% cheaper per unit; two free packages tie without dividing by zero. If two positive rates produce a percentage that rounds to 100%, it is labeled `~100%`. Reject missing, malformed, negative or nonfinite data.

Changing dimension requests confirmation before clearing existing quantities/units; prices remain. Reset requests confirmation when data exists. Only dimension and display bases are saved; prices and quantities disappear after the session. Defaults: mass, grams for initial quantity entry, per kg; volume uses per L.

Example: A costs 4 for 500 g and B costs 5.5 for 750 g. A is 8 per kg; B is approximately 7.33333333 per kg, or 8.33333% cheaper per unit. A still costs less cash to purchase.

## Preview and input

Open [preview.html](preview.html) directly; it needs no server, network or SDK. Click or tap the controls. Digits, Backspace and Delete operate an editor; Enter commits when no button is focused, and Escape cancels. Focused buttons use normal Enter/Space activation. Enlarge 2× is outside the band UI.

The preview and native app import the same arithmetic, state, formatting and layout logic. The preview is not a Vela emulator. Native fonts, touches, gestures and storage still require a physical-band check.

Decimal drafts accept at most 12 digits, plus a decimal point and a sign where supported. Incomplete drafts stay in the editor. No scientific-notation text entry. Committed computations use JavaScript doubles with finite-result and nonzero-underflow checks; displayed values use up to eight significant digits, or scientific notation. No intermediate display rounding is fed back into arithmetic. This is not arbitrary-precision decimal arithmetic.

## Build and signing

Requires Node **22**, npm and OpenSSL. `aiot-toolkit` remains pinned to **2.0.5**. Each project builds independently and keeps its own lockfile.

```sh
npm ci
npm test
npm run preview
npm run preflight
npm run build
npm run keygen  # First signing identity only; skip when your pair already exists.
npm run release
```

`npm run build` creates a development package. `npm run release` creates the signed release in `dist/`. Use only the fresh package from a successful release; the toolkit prints a temporary staging path before moving the artifact into this project's `dist/`.

The first local signing pair is in `sign/private.pem` and `sign/certificate.pem`. **Back up both privately and reuse this pair for this app's updates.** The helper refuses to overwrite either file; if only one exists, recover its matching partner. Signing files are excluded from version control and are unrelated to any Bluetooth authentication token.

Install the release using your established Band 10 app-installation workflow, verifying the app ID and version first. Version-tag pushes publish GitHub Releases as described below; installation on the band remains manual.

## Engineering and validation

- `src/common/core.js`: application engine, state transitions and screen data.
- `src/common/shared.js`: strict decimal entry, display formatting and keypad geometry.
- `src/common/preferences.js`: injected best-effort storage adapter.
- `.ux` page: Vela rendering and a single tap handler; it contains no duplicate arithmetic.
- `npm test`: dependency-free deterministic Node tests, including storage and capsule geometry.
- `npm run preview`: regenerate the standalone preview and layout metadata.
- `npm run preflight`: identity, route, icon, allowed features, native bindings and preview freshness.

Storage uses documented `system.storage`, saves only changed preferences, serializes writes, and ignores delayed restoration after user interaction. Missing, corrupt or failed storage does not block the app. No network, accounts, telemetry, ads, sensors, background service, wakelock or runtime arithmetic library.

Browser checks are also reproducible with Playwright CLI: open this project’s preview in a CLI browser session, then run `playwright-cli run-code --filename scripts/check-preview.js`. The check resets this preview’s preferences, exercises taps/keyboard input, and records screenshots under `output/playwright/`. Playwright is development tooling, not an app dependency.

See [validation notes](docs/VALIDATION.md) for the actual test counts, compiler results, fresh output paths and remaining warnings. Build/preview success is distinct from unverified physical-band behavior.

## GitHub Releases

Pushing a stable version tag such as `v0.1.0` runs [.github/workflows/release.yml](.github/workflows/release.yml). It tests the app, rebuilds the preview, signs a fresh RPK and publishes it with a SHA-256 checksum on this repository's [Releases page](https://github.com/groig/wrist-compare/releases). Download the `.rpk` asset for installation. Branch pushes do not publish releases; Actions artifacts are not used.

The repository needs two Actions secrets containing the **existing PEM files** for this app. From this project's root, configure them without printing their contents:

```sh
gh secret set RPK_PRIVATE_KEY --repo groig/wrist-compare < sign/private.pem
gh secret set RPK_CERTIFICATE --repo groig/wrist-compare < sign/certificate.pem
```

Keep the same pair for all updates. The workflow validates that the private key and certificate match, restores them only after dependency installation/tests, and removes them when the job ends. It never generates a new signing identity. GitHub's built-in workflow token publishes the release; no separate personal token is needed.

Before a new release, choose the next version and increment `src/manifest.json`'s `versionCode`. Update the manifest's `versionName` to the same version, then use `npm version <version> --no-git-tag-version` to update `package.json` and `package-lock.json`. Tests and preflight must pass. Commit and push the changes before tagging.

For the initial release, the current metadata already matches:

```sh
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

The tagged commit must contain the workflow and its helper scripts. The tag must exactly match the package, lockfile and manifest versions. Supported tags are stable `vMAJOR.MINOR.PATCH` versions; prerelease suffixes are rejected.

Failed validation/builds do not publish a release. Uploads happen in a draft before publication; rerunning a failed upload can resume that draft. Existing published releases are never replaced—make a new version/tag for a changed build. A successful run links to the release in its job summary.

CI runs on Ubuntu 24.04 with Node 22 and the existing toolkit 2.0.5. The release-validation tests also require Python 3 and OpenSSL. Run `npm test` for app and release checks; the GitHub workflow does not run browser automation. See [CI validation](docs/CI-VALIDATION.md) for checks completed during setup.

## References and license

- [Vela project structure](https://iot.mi.com/vela/quickapp/en/guide/start/project-overview.html)
- [Vela storage](https://iot.mi.com/vela/quickapp/en/features/data/storage.html)
- [NIST conversion definitions and tables](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8)

[MIT](LICENSE). Adapted build, keypad and preview patterns retain the Wrist Calc contributors' attribution. Each app has an original geometric launcher icon. External development tools retain their own licenses.
