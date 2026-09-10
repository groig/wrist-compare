# GitHub release workflow validation

Validated locally on 2026-09-10 with Node 22.23.2, npm 10.9.2 for the clean installation, Python 3 and OpenSSL. The GitHub job uses Ubuntu 24.04 and Node 22 from `.nvmrc`.

- `actionlint` 1.7.12: workflow passed; publisher also passed `bash -n`.
- Fresh checkout copy with no existing `node_modules`, build output or signing files: `npm ci` passed using the committed lockfile and toolkit 2.0.5.
- `npm test`: **45 tests passed, zero failed**, including 18 release-pipeline tests.
- Preview generation and preflight passed.
- Existing local signing pair restored through the same environment-variable interface as repository secrets. No identity was regenerated; temporary signing files were removed afterwards.
- Native signed release compiled successfully. Exact output name, fresh timestamp, packaged app/version/resources, ZIP integrity and the embedded signing certificate passed verification. SHA-256 sidecar generated.
- Release tests reject invalid/mismatched tags, stale metadata, invalid version codes, absent/malformed/mismatched signing secrets, existing signing files, and missing/stale/corrupt/wrong-identity/wrong-certificate RPKs.
- A fake GitHub CLI exercises create/upload failures, retrying unfinished drafts and refusing to overwrite published releases. Test publication makes no GitHub API writes.
- Each repository's two signing secrets were configured from its existing pair. Secret contents were not printed.

The initial setup has not pushed a release tag or run this workflow on a GitHub-hosted runner. The first real version-tag push verifies hosted execution and publication. The workflow publishes no Actions artifacts; downloadable files belong to GitHub Releases.

Pinned dependency deprecation/audit warnings remain; dependency versions were not upgraded. npm reported: npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me; npm warn deprecated glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me; 14 vulnerabilities (3 low, 11 high).

The release checksum from the isolated local check was:

```text
13a484e29ff90473ec8301d29649b22c377c16f82553e6d6a1c192e9c4cf33f9  org.roig.wristcompare.release.0.1.0.rpk
```

That check used a temporary checkout; the durable public download will be attached to the matching GitHub Release after a successful tag-triggered run. Hardware behavior remains outside this CI check.
