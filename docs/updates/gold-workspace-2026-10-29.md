# Gold research suite remodel

29 October 2026 · Hosted v225 · Native revision `89dabd844238dd7f6738b4b4da692a37511dbee3`

The Gold member workspace now uses a coherent charcoal and champagne design across Gold home, Wallet Watch, snapshots and the AI assistant. Shared suite navigation connects the four workflows, tracks the active research tab, and keeps the presentation scoped to those routes.

## What changed

### Gold home and monitoring

The membership surface and monitor were reorganized around the saved wallets and projects. Members can filter the monitor by type, search by name or full address, and see saved-item counts, the last collection time and the refresh mode together. Filtering is local: it does not change saved entries or request additional provider data. A refresh still collects the full saved monitor, even when the displayed view is filtered.

Unavailable balances and transaction histories remain distinct from observed zero. Wallet changes clear the rendered member monitor and prevent an older scan from restoring its prior private view.

### Wallet Watch and snapshots

Wallet Watch, Project Passports, snapshot comparisons and the saved report library receive a shared research layout with clearer forms, toolbars, tables and empty states. Local searches filter the account rows already loaded by the existing research controller. Search can be focused with `/` and cleared with Escape when the appropriate view is active.

The redesign preserves the existing address-based watches, saved evidence, export verification, SolHandle display boundaries and snapshot comparison behavior. The source remains labeled with its observation time and coverage; missing data does not become a fabricated metric.

### Gold AI assistant

The assistant is organized around a searchable conversation library and a larger research desk. Saved Passport selection, a same-token comparison, optional focus suggestions, the question composer, character count and request allowance are easier to locate. Command/Ctrl+Enter submits through the existing form when permitted.

Rendered answers use safe text and only turn retrieved evidence references into links to the supported providers. The display continues to distinguish saved snapshot evidence from the provider's current page. Existing account access, verified Gold checks, quota enforcement, failed-answer handling and wallet-change isolation remain in place. No background AI generation or new provider integration was added.

## Included catch-up

This public record also includes the earlier v221 Terminal launch-card work that followed the last synchronized release: the public interface capture, PNG and editable SVG card, Terminal metadata, documentation and render helper. The share-route adapter is represented by a concise source-only summary. The captured market figures are a historical public-interface observation, not live market data.

## Verification

The production build and scoped native membership, monitoring, research, assistant, wallet, SolHandle and navigation checks passed. The new workspace test checks rendered control/label targets, asset references, duplicate IDs, route isolation and active-tab synchronization. The new monitor test covers filtering/search, unchanged saved entries, full-monitor collection, timestamps, unavailable versus observed zero and in-flight scan isolation after a wallet change.

The new public snapshot carries the relevant offline browser checks and exact dependencies; `npm run check:gold-workspace` runs them within the public kit. The root sync verifier records all source changes, exact hashes and retention of earlier snapshots. Source-backed verification against the native commit complements public-only CI.

Live desktop review exercised Gold home, Wallet Watch, the snapshot library, comparison and Gold AI views. **Verification limits:** authenticated member-state visuals and mobile viewport testing were not performed. The unrelated existing whole-site integrity script failed at its data-URL route loader's unresolved `../../gatto-profile` import and is not claimed as passing. Browser fixtures do not establish real-device wallet signing, production provider availability or live AI answer quality.

## Source record

- [Reviewed source snapshot](../../platform-updates/gold-workspace-2026-10-29/)
- [Exact export and retention ledger](../../platform-updates/gold-workspace-2026-10-29/PUBLIC-SYNC.json)
- [Source provenance](../../platform-updates/gold-workspace-2026-10-29/PROVENANCE.json)
- [Release protocol](../RELEASE-SYNC.md)

The Gold remodel changes browser presentation and client interaction. Private service implementation, account data, secrets and hosting configuration stay outside the public export. All previously published snapshots and their original provenance remain intact.
