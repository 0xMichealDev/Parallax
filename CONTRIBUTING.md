# Contributing to PARALLAX

Thanks for taking the time to inspect the integration. This repository contains selected identity source; platform-wide issues should identify the affected hosted page clearly.

## Before you start

Read the [architecture](docs/ARCHITECTURE.md) and [integration contract](docs/INTEGRATION.md). For a substantial change, open a feature proposal so its scope can be discussed first. A public contribution does not change the current source-preview licensing status.

## Local checks

Use Node.js 22.13 or newer:

```sh
npm ci --ignore-scripts
npm run check
```

Keep a change focused. Add regression coverage when changing ownership resolution, failure behavior, expiry, request races or address fallback. See [Testing](docs/TESTING.md) for the validation limits.

## Pull requests

Explain the user-visible problem, the behavior after the change and the evidence used to verify it. The pull request template provides prompts. Use fixtures and avoid live provider dependencies in tests. Update the relevant guide when changing the public contract.

The two extracted modules have hashes in `PROVENANCE.json`. Do not simply replace those hashes to make a failing check green. A source change needs a reviewed provenance update describing its origin and any divergence from the extracted version.

## Safe reports

Use the bug template for reproducible non-sensitive problems. Do not include API keys, private RPC URLs, seed phrases, signatures or personal account exports. Ask for a private contact as described in [SECURITY.md](SECURITY.md) before sharing a suspected vulnerability.

Please keep discussions specific, respectful and centered on evidence. Maintainer review is required before a change becomes part of a release.
