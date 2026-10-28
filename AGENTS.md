# PARALLAX public release rules

This repository is the public developer kit for PARALLAX. The native Sites repository is the application’s source of truth. They have different Git histories and publication paths. Never replace this repository with the private source checkout, repoint either remote, or push native source history here.

## Every completed platform update must be reflected here

The owner has requested that future PARALLAX updates stay reflected in this public repository. Treat the public update as part of completing a platform release, including changes that cannot be published as source. Routine updates within the reviewed public scope use the existing authorization; they do not require a new confirmation merely because this policy exists.

For each successfully deployed source revision:

1. Read `PUBLIC-SYNC.json` and [the release protocol](docs/RELEASE-SYNC.md). Use the latest recorded native source commit as the next baseline.
2. Review the complete native Git delta, with renames represented as delete/add. Classify every changed path as an approved exact-file export or a concise source-only change summary. Include unchanged dependencies only when needed and reviewed.
3. Add a new immutable directory under `platform-updates/`. Record exact source paths, byte counts and SHA-256 hashes in its `PUBLIC-SYNC.json`. Export only the reviewed files. Separate generated release notes/provenance/check helpers from source bytes.
4. Preserve every existing snapshot and imported historical archive. Append the new release to the root index; never rewrite an older snapshot to make it resemble current code.
5. Update the public README, changelog and release notes with shipped behavior, checks and actual limitations. Private changes still get a useful public summary without their implementation or operational data.
6. Run the public checks and the source-backed gate against the exact recorded commit. Compare with the previously published public commit using `--base-ref`. Review the final public diff, then publish through the authorized GitHub workflow.
7. Report native deployment and public GitHub results separately. A successful Site deployment does not establish that the public update succeeded. If sync is blocked, say which release is pending and why; leave the previous verified ledger intact.

If several completed source revisions accumulated, a single catch-up snapshot may cover the full delta from the last recorded commit. Explain the grouped releases in its notes. A source revision that has not been deployed must not be labelled as a deployed release.

## Public scope and data boundaries

- `approvedExports` is an exact-file allowlist, not permission to copy a directory tree. Preserve exported bytes and source-relative paths. Every added or modified `public/` file must be exported; a summary cannot substitute for its code or asset. Deleted public files receive an explicit removal summary.
- Browser assets/code, reviewed HTML, public catalog data, implementation notes, offline tests and render helpers are candidates for review. Their folder name alone does not establish that their contents are safe to publish.
- The verifier has a small exact allowlist for reviewed presentation/metadata TypeScript modules. Each release must also name the exceptions it uses in `reviewedPresentationSources`. New exceptions require source review and an explicit verifier change; never broadly allow `app/` or `route.ts` files.
- Private API/service/database/authentication code, operational configuration, user or account data, credentials, native Site metadata and secret-bearing URLs remain excluded. Use non-sensitive source-only summaries. Do not copy a dependency merely to make a public test run if that dependency belongs to the private application.
- Generated snapshot support is limited to the reviewed names `README.md`, `PROVENANCE.json` and `verify.mjs` at the snapshot root. Review their contents too; never rename native source as a generated file. A new generated-support path requires an explicit verifier change and review.
- Never place credentials in source, manifests, arguments, logs, issues or workflow secrets for this sync. Native Sites credentials stay in memory and go to the supported helper through hidden stdin. GitHub Actions does not receive native Sites credentials.
- Keep original authorship and licensing/provenance records. Source availability here does not grant a new license or make the snapshot a complete runnable platform.

## Verification and background catch-up

```sh
node scripts/verify-public-sync.mjs
node scripts/verify-public-sync.mjs --source /absolute/native-checkout --release RELEASE_ID
node scripts/verify-public-sync.mjs --base-ref PREVIOUS_PUBLIC_COMMIT
npm run check
```

The verifier is read-only: it cannot export, commit, push, refresh credentials or deploy. Its public-only mode validates the committed evidence; it cannot independently observe the private source or live deployment.

The owner’s recurring catch-up automation is an additional safeguard, separate from GitHub CI. When running that task, resolve the latest successfully deployed source revision through native Sites tools, refresh the two checkouts without disturbing active work, and follow the same release protocol. On no drift, do not create a redundant release. On unavailable access, conflicting history, ambiguous export scope or a failed gate, stop publication, preserve the last verified state and report the concrete blocker. Never claim the hourly job is active without checking its actual enabled schedule.

Changes to this policy, the verifier or its exception list require the focused `tests/public-sync.test.mjs` checks. These rules apply to agents editing this public repository and to future release work that reads it.
