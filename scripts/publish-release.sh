#!/usr/bin/env bash
set -euo pipefail

: "${RELEASE_TAG:?Missing release tag}"
: "${GH_REPO:?Missing repository}"
: "${RPK_PATH:?Missing RPK path}"
: "${CHECKSUM_PATH:?Missing checksum path}"
: "${RUNNER_TEMP:?Missing runner temporary directory}"
[[ -s "$RPK_PATH" && -s "$CHECKSUM_PATH" ]] || { echo 'Validated release files are missing.' >&2; exit 1; }

# A failed upload may leave a draft. Only drafts can be resumed; published
# releases are never overwritten. Workflow concurrency serializes each tag.
if gh release view "$RELEASE_TAG" --json isDraft > "$RUNNER_TEMP/release-state.json" 2> "$RUNNER_TEMP/release-view-error.txt"; then
  node -e 'const r = require(process.argv[1]); if (!r.isDraft) { console.error("This release is already published; refusing to replace it."); process.exit(1); }' "$RUNNER_TEMP/release-state.json"
  gh release upload "$RELEASE_TAG" "$RPK_PATH" "$CHECKSUM_PATH" --clobber
else
  gh release create "$RELEASE_TAG" "$RPK_PATH" "$CHECKSUM_PATH" \
    --verify-tag --draft --title "$RELEASE_TAG" --generate-notes
fi

gh release edit "$RELEASE_TAG" --draft=false
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  printf 'Published [%s](https://github.com/%s/releases/tag/%s) with the installable RPK and SHA-256 checksum.\n' \
    "$RELEASE_TAG" "$GH_REPO" "$RELEASE_TAG" >> "$GITHUB_STEP_SUMMARY"
fi
