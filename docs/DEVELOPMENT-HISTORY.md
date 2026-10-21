# PARALLAX development history

Recorded October 20, 2026. This retrospective describes the separate hosted application's history through source revision `c2b3bde25a0a1836ad37498c16919cdbaaa588ab`.

## The record

| Measure | Verified count |
| --- | ---: |
| Commits reachable from the application source revision | 162 |
| Saved site versions, numbered 1–158 | 158 |
| Distinct source revisions referenced by those saved versions | 158 |

## Historical source import

**History import status: prepared.** The [receipt](history/import-receipt.json) records completion. A filtered export contains 155 genuine historical revisions across 209 selected browser-code, stylesheet and implementation-note paths. Seven source revisions had no changes within the exported paths. One browser file was excluded across all revisions because it contained personal identifying text.

The imported branch preserves original author, committer, both timestamps, commit messages and selected file bytes. Paths are prefixed with `historical-platform/`; filtering changes commit IDs. The [import manifest](history/import-manifest.json) maps all 162 original revisions to imported revisions or omission reasons. No commits have been fabricated for inactive days and no author attribution has been reassigned.

The original author is Codex. Repository history does not guarantee credit on a personal contribution calendar. The repository total also includes developer-kit and import commits, so it should not be advertised as a count of distinct features.

The original source remains unchanged. Backend services, private account data, media, page shells and deployment configuration are not included. The historical archive is a selected-source preview, not a runnable replacement for the hosted application.

The [complete history ledger](history/source-history.json) records every reachable source commit, its original committer timestamp and parents, the corresponding saved version when present, and the changed-file count. Four source commits have no saved-version reference in the retrieved history. Saved versions are not necessarily successful deployments. File counts include assets and generated files, so they are not productivity scores.

Original source revisions are provenance references in the separate application repository. Filtered revision IDs in the import manifest identify the public imported history after completion. A maintainer with source access can reconcile the two; the complete private application history is not published. The earlier metadata ledger remains as the record of all 162 source revisions.

## Activity by day

Dates below use America/Anchorage and the original Git committer timestamps. The JSON retains original timestamp offsets.

| Date | Source commits |
| --- | ---: |
| 2026-10-10 | 6 |
| 2026-10-11 | 25 |
| 2026-10-12 | 14 |
| 2026-10-13 | 19 |
| 2026-10-14 | 19 |
| 2026-10-15 | 18 |
| 2026-10-16 | 13 |
| 2026-10-17 | 16 |
| 2026-10-18 | 7 |
| 2026-10-19 | 18 |
| 2026-10-20 | 7 |

## Product updates

The [platform guide index](platform/README.md) preserves the current public guides for Project Passports, Wallet Watch and Telegram setup, Gold membership and Assistant, SolHandle, Creator Studio and Atlas, transparency, release notes and roadmap. These are current feature descriptions from the source revision above, not inferred per-commit release dates.

Earlier development also includes the Observatory, exploration scenes, planet presentation and navigation work. The ledger covers that source history without claiming each saved revision is a distinct feature. See the hosted [Flight Plan](https://parallaxlaunch.live/roadmap) for creative direction and the [current roadmap](platform/roadmap.md) for shipped features versus future scope.

## How this was checked

The source count comes from `git rev-list --count HEAD`. Entries come from `git log --reverse --topo-order --format=%H|%cI|%P`; file counts come from `git diff-tree --root --no-commit-id --name-only -r COMMIT`. Every saved-version source revision was matched to a reachable commit. The source checkout was inspected without modification.

Ledger SHA-256: `4676a9f1f589778714c888ac2429ec1c0010b5f401abee2c8445c59cc9ae587d`.

## Remaining validation

The public guides retain their original validation limits: joint SolHandle SDK review, an authorized live NFT transfer, iPhone/Phantom signing, and signed-in Gold model-response and real-device Telegram walkthroughs. Historical development activity is not an independent audit or evidence that those checks have been completed.
