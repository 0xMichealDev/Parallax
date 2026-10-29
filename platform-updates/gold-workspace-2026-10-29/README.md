# Gold research suite — October 29, 2026

This immutable snapshot records the Gold workspace remodel in hosted **v225**, native source revision `89dabd844238dd7f6738b4b4da692a37511dbee3`. The source baseline is `33f8c23fa4aca7e181f4713531a066f6ac5c822a`, the preceding verified public record.

## Included experience

- A shared charcoal and champagne Gold presentation and route-aware navigation across Gold home, Wallet Watch, saved snapshots and the AI assistant.
- A remodeled member monitor with wallet/project filters, local name/address search, saved-item counts, collection time, refresh mode, clear empty states and distinct unavailable/zero observations.
- Wallet Watch and snapshot-library layouts with local filtering of already-rendered account rows, keyboard focus helpers and clearer investigation/comparison spaces.
- A redesigned assistant with searchable saved conversations, selected-evidence controls, focus suggestions, visible request allowance, keyboard submission and source links tied to retrieved evidence.
- Preserved membership checks, account isolation, wallet-change handling, evidence timestamps and user-triggered request behavior.

The snapshot also catches up the prior v221 Terminal launch card, its public interface capture, matching HTML metadata, documentation and rendering helper. Its new share-route integration is described in `PUBLIC-SYNC.json`; no broad route or private-service export is introduced.

## Exact source and scope

The `app/`, `public/`, `scripts/` and `tests/` paths here contain exact blobs from the recorded native commit. `app/workspace-shell.ts` is an existing reviewed presentation exception. `PROVENANCE.json` lists source hashes and byte counts; `PUBLIC-SYNC.json` classifies the complete native delta and records preservation fingerprints for every earlier snapshot.

This is a browser-source and presentation snapshot, not the full deployable application. Private API services, authentication, account records, database implementation, runtime secrets and hosting configuration are not included. The Gold remodel did not change those services. Public browser scripts still reference the hosted application's existing endpoints.

## Reproduce the public checks

From the public repository root, after `npm ci --ignore-scripts`:

```sh
npm run check:gold-workspace
node scripts/verify-public-sync.mjs
```

The Gold check runs rendered-markup integrity and asset/control-target checks, suite navigation synchronization, member monitor filtering and wallet-change isolation, assistant access/safe-source rendering/failure recovery, membership UI, share-card, wallet UI, SolHandle UI and the shared navigation/usability fixtures. These use offline fixtures; they do not request production wallet data, sign messages, create AI answers, or execute transactions.

The native source-backed gate additionally verifies that exported bytes match the exact commit and every changed source path is classified. GitHub CI sees only this public checkout and cannot independently verify native code or live deployment.

## Validation limits

The production build and scoped native checks completed successfully. Live desktop review exercised Gold home, Wallet Watch, the snapshot library, comparison and Gold AI views. Authenticated member-state visuals and mobile viewport testing were not performed. Passing markup and behavior fixtures does not establish real-device signing or live provider availability.

The pre-existing whole-site `tests/site-integrity.mjs` loader cannot resolve `../../gatto-profile` while importing a generated data-URL route module. That unrelated suite is not recorded as passing for this release. Focused Gold route/asset integrity is covered by the included workspace test instead.

The included Terminal card renderer uses Sharp (directly or through the native Wrangler dependency). Its exact source is provided for provenance; Sharp is not added to this developer kit or required by its offline CI checks. The published PNG, SVG and capture are included as immutable assets.

Previous source snapshots and the historical archive retain their published bytes. Source availability here does not grant a new license or make this snapshot a complete platform or a security audit.
