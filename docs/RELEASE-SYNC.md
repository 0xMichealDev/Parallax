# Keeping the public kit current

PARALLAX’s native Sites repository contains the application. This public repository contains reviewed browser source, assets, presentation code, focused tests and development records. The release process keeps every completed platform update represented here while preserving that separation.

A platform release is complete when its successful deployment and its public GitHub update have both been recorded. A private implementation change can be represented by a source-only summary; “kept current” does not mean publishing all application source.

## What is enforced

`scripts/verify-public-sync.mjs` is a dependency-free Node.js gate. It makes no network requests and never copies files, changes Git state, pushes or deploys.

| Check | Public checkout only | With native source checkout |
| --- | --- | --- |
| Exact exported paths, bytes and SHA-256 hashes | Yes | Yes |
| No extra files within a new snapshot | Yes | Yes |
| Path escapes, symlinks, private configuration paths | Rejected | Rejected |
| Reviewed presentation-module exceptions | Exact file allowlist | Same allowlist |
| Older snapshot fingerprints | Verified | Verified |
| Every native changed path classified | Not observable | Verified against the complete commit delta |
| Added/modified public runtime code and assets exported | Summary substitutions rejected | Verified against actual source change statuses |
| Export equals the recorded native source blob | Not observable | Verified directly from Git objects |
| Current deployment is represented | Not observable | Requires the actual deployed commit from native Sites tools |

An allowlist and matching hashes do not replace content review. They establish which bytes were selected and whether the published evidence still matches that selection. A clean check does not assert a security audit, correctness of excluded private code or live service availability.

## Release protocol

### 1. Establish both revisions

Read the latest entry in the public `PUBLIC-SYNC.json`. Refresh the native Site through the supported Sites source workflow and obtain the exact commit associated with the successful deployment. Do not assume the native source branch head is deployed: source packaging and Site deployment are separate steps.

Use the complete source helper opening result for later packaging. The helper owns native source preparation, ordered checks/builds, commit/push and packaging. Native credentials must remain in session memory and reach the helper only through hidden stdin. Do not move them into GitHub Actions, environment files, shell arguments or repository configuration.

Record the previous public Git commit before starting its update. If either checkout has another task’s uncommitted work, isolate a checkout instead of discarding it. Stop on missing ancestry or diverged history; do not force-push or rewrite the ledger to hide the discrepancy.

### 2. Review and classify the whole delta

Use the previous recorded native commit as `baselineCommit` and the deployed commit as `commit`:

```sh
git -C /absolute/native-checkout diff --name-status --no-renames BASELINE_COMMIT DEPLOYED_COMMIT
```

Every resulting path must have one of two outcomes:

- **Approved export:** publish the exact file from the recorded commit under the same source-relative path inside the new snapshot. Necessary unchanged dependencies may also be exported after review.
- **Source-only change:** record its path, Git status and a concise non-sensitive description. This includes private implementation and deleted files. Describe the effect or reason for omission; do not paste private source, secrets, operational configuration or account data into the explanation.

Every added or modified file under `public/` must be exported, including intermediate publicly served assets. A source-only summary cannot stand in for that browser code or artwork. Public deletions must receive explicit removal summaries. The source-backed gate checks actual Git statuses, so mislabelling an update as a deletion cannot bypass this requirement.

Renames and copies are intentionally treated as ordinary delete/add changes. This makes completeness independent of Git’s rename similarity threshold. Supported statuses are `A`, `M`, `D` and `T`.

The default source candidates are `public/`, `docs/`, `tests/`, `scripts/`, top-level `app/*.html`, top-level `app/*.json` and `AGENTS.md`. Only the exact presentation/metadata modules named in the verifier’s `REVIEWABLE_PRESENTATION_SOURCES` set can be additional TypeScript candidates. The release must name each used exception in `reviewedPresentationSources` as well. Existing reviewed metadata adapters can be exported even where their filename is `route.ts`; this never grants permission for all routes or their private dependencies.

Do not recursively copy the native repository, its Git history, a deployment archive or an entire top-level application folder. A source-only summary is the appropriate result when implementation is private. A public test that depends on excluded application internals should be omitted or use an explicitly documented public fixture; it does not justify widening the export.

### 3. Create an immutable snapshot

Choose a new unique release ID, such as `worlds-expeditions-2026-10-28`, and create `platform-updates/RELEASE_ID/`. If there is another release on the same date, use a distinct suffix. Read selected bytes from the recorded commit, not from a potentially newer working tree.

Keep source exports unchanged. Put generated release documentation, `PROVENANCE.json` and any local verification helper in `generatedFiles`, with a purpose, byte count and SHA-256 hash. The exact permitted support names are `README.md`, `PROVENANCE.json` and `verify.mjs`, all at the snapshot root. Arbitrary subdirectories and renamed source modules are rejected. Review these files’ contents as well; a valid helper filename does not make its contents safe. A new generated-support path requires review and an explicit change to the verifier. The release manifest itself is the sole self-reference exemption.

Preserve all old snapshot directories and `historical-platform/`. Obtain each fingerprint from the unchanged public baseline:

```sh
node scripts/verify-public-sync.mjs --fingerprint platform-updates/workspace-2026-10-25
node scripts/verify-public-sync.mjs --fingerprint historical-platform
```

The fingerprint hashes sorted records of `relativePath + NUL + fileSHA256 + newline`, with paths relative to the retained directory. It also records the file count. File modification times and directory timestamps are excluded. Symlinks and special files are rejected.

Append the new entry to the root index. Never remove, reorder or rewrite old releases. A future manifest’s baseline must equal the previous manifest’s source commit. Keep the root README, changelog and release links current; these mutable overview documents are outside the immutable snapshot hash set.

### 4. Verify and publish

```sh
node scripts/verify-public-sync.mjs
node scripts/verify-public-sync.mjs --source /absolute/native-checkout --release RELEASE_ID
node scripts/verify-public-sync.mjs --base-ref PREVIOUS_PUBLIC_COMMIT
node --test tests/public-sync.test.mjs
npm run check
```

The source-backed check reads committed Git objects, so it can verify an older release without checking out that revision. It requires every source delta path to be exported or summarized, rejects invented summaries and checks the exact source bytes. The public-base check verifies that existing release index entries were retained and that already published snapshots were not edited, including attempts to refresh their hashes after changing them.

Review the complete proposed public diff and verify that no credentials, native hosting metadata, user data or private implementation slipped into exports, generated files or summaries. Publish through the authorized GitHub path, retain existing history, and confirm the resulting commit/check status. Do not describe GitHub CI as having verified private source or deployment state: it only has the public checkout.

If native deployment succeeds but GitHub publication fails, report those outcomes separately and retain the failed release for retry. Do not change the recorded public revision to imply success. If GitHub updates but a later Site deployment fails, the public notes must not describe that failed revision as live.

## Manifest contract

The root index has this shape:

```json
{
  "schemaVersion": 1,
  "latestRelease": "RELEASE_ID",
  "releases": [
    {
      "id": "RELEASE_ID",
      "manifest": "platform-updates/RELEASE_ID/PUBLIC-SYNC.json"
    }
  ]
}
```

IDs in real manifests are lowercase letters, numbers and hyphens. Entries are chronological and append-only; `latestRelease` names the last one. Old snapshots from before this protocol remain retained directories and need not be retroactively rewritten into the index.

Each release manifest uses these fields:

| Field | Required value |
| --- | --- |
| `schemaVersion` | `1` |
| `releaseId` | The index entry’s ID |
| `source.repository` | The literal label `native-sites`; no remote URL or credentials |
| `source.baselineCommit` | Full lowercase 40-character native Git commit hash |
| `source.commit` | Full lowercase 40-character native Git commit hash for this release |
| `source.hostedVersion` | Positive native hosted version number; not an asset cache suffix |
| `reviewedPresentationSources` | Exact approved presentation/metadata source exceptions, or `[]` |
| `approvedExports` | `{source, destination, sha256, bytes}` records; `destination` is the snapshot root plus `/` plus `source` |
| `sourceOnlyChanges` | `{path, status, summary}` records for changed paths not exported |
| `generatedFiles` | `{path, sha256, bytes, purpose}` records for public support files inside this snapshot |
| `retainedSnapshots` | `{path, treeSha256, fileCount}` records for every prior snapshot and the historical archive |

All paths are repository-relative POSIX paths. Hashes are lowercase hexadecimal SHA-256 values. Every file in the snapshot must be an approved export, a generated file or its own `PUBLIC-SYNC.json`; there is no implicit wildcard. The manifest cannot hash itself. `PROVENANCE.json` is generated support and therefore can be hashed normally.

## Hourly drift and catch-up task

The recurring task is an authenticated ChatGPT automation, separate from this repository’s GitHub workflow. Its actual enabled state and schedule must be checked through the owner’s automation tools. A description in this document or an `AGENTS.md` instruction is not evidence that a background job is running.

The task follows this sequence:

1. Read this policy and the public ledger. Resolve the Site and latest successful deployed revision with native Sites tools; open or refresh its source through the supported helper. Resolve the public repository’s latest default branch through its authorized GitHub access.
2. Run the public checks, then compare against that exact deployed revision:

   ```sh
   node scripts/verify-public-sync.mjs --source /absolute/native-checkout --check-drift --source-revision DEPLOYED_COMMIT --json
   ```

3. If current, finish without creating a commit or noisy repeated report. If the public ledger is behind, perform the same reviewed export, summary, validation and publication protocol above. Several missed releases may be grouped into one clearly documented catch-up snapshot.
4. If credentials are unavailable, history diverges, the source checkout is stale or dirty, a check fails, or a file cannot be safely classified, preserve the last verified public state and report the specific blocker. Do not invent credentials, broaden public scope or claim that a failed catch-up completed.

The drift command exits `0` for a verified current state, `1` for invalid or incomplete evidence, and `2` for drift. JSON statuses distinguish `public-behind-source`, `source-checkout-behind` and `source-history-diverged`. It is read-only and performs no catch-up itself. Without `--source-revision`, it compares native `HEAD`, which is useful during development but is not proof of the deployed state.

The normal release workflow should update GitHub before its final handoff. The hourly task is a recovery path for missed updates and can be delayed by scheduler timing or unavailable service access; it is not an instantaneous mirror or a guarantee of continuous synchronization. GitHub CI continues to validate public artifacts without native Sites credentials.
