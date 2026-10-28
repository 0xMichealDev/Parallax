<p align="center">
  <img src="assets/parallax-banner.svg" alt="PARALLAX — The Onchain Observatory. Research with context. Build with evidence." width="100%">
</p>

<p align="center">
  <a href="https://parallaxlaunch.live"><strong>Open PARALLAX</strong></a> ·
  <a href="https://parallaxlaunch.live/docs"><strong>Documentation</strong></a> ·
  <a href="docs/ARCHITECTURE.md"><strong>Architecture</strong></a> ·
  <a href="docs/ROADMAP.md"><strong>Roadmap</strong></a> ·
  <a href="CHANGELOG.md"><strong>Changelog</strong></a>
</p>

# Research with context. Build with evidence.

[![Integration checks](https://github.com/0xMichealDev/Parallax/actions/workflows/ci.yml/badge.svg)](https://github.com/0xMichealDev/Parallax/actions/workflows/ci.yml)

PARALLAX is a Solana research and creator workspace. It brings project research, wallet activity and creator identity into one place, with source links and clear verification boundaries.

This repository is the **PARALLAX developer kit and public source record**: selected integration code, dated browser-source snapshots, runtime artwork, executable tests and implementation notes. The hosted platform is available at [parallaxlaunch.live](https://parallaxlaunch.live). Private server services and the full application deployment are maintained separately.

## The platform

| Workspace | Purpose | Guide |
| --- | --- | --- |
| **Terminal** | Discover markets, inspect charts and bonding progress, and review trades. | [October 24 update](docs/updates/terminal-2026-10-24.md) |
| **Project Passports** | Collect, save and compare token research snapshots with source context. | [Passports](https://parallaxlaunch.live/docs/passports) |
| **Wallet Watch** | Inspect wallet activity and keep saved watches tied to exact addresses. | [Wallet Watch](https://parallaxlaunch.live/docs/wallet-watch) |
| **Project Atlas** | Explore community project profiles and creator identities. | [Creator tools](https://parallaxlaunch.live/docs/creators) |
| **Worlds & Expeditions** | Explore realistic project worlds, visit GATTO's city and play as a sheep in the lunar habitat. | [October 28 update](docs/updates/worlds-expeditions-2026-10-28.md) |
| **Gold** | Holder access to research assistance, monitoring and membership features. | [Gold membership](https://parallaxlaunch.live/docs/gold) |
| **SolHandle** | Resolve readable handles while independently checking current ownership. | [SolHandle](https://parallaxlaunch.live/docs/solhandle) |

**Latest platform update:** [Worlds, Expeditions & Community Tools — October 28, 2026](docs/updates/worlds-expeditions-2026-10-28.md), covering feature work after v186 through v210: realistic project worlds, both playable expeditions, Atlas improvements, project sharing, SolHandle's world presentation and the public project-wallet linking interface. The [new snapshot](platform-updates/worlds-expeditions-2026-10-28/) is pinned to the subsequent workflow-only v211 source revision, which records the continuing GitHub publication policy; the game runtime remains v210. It includes the browser implementation, complete world/game runtime assets, artwork sources, render helpers and offline checks. Earlier [workspace](docs/updates/workspace-2026-10-25.md) and [Terminal](docs/updates/terminal-2026-10-24.md) snapshots remain available.

The latest snapshot contains **454 exact source exports totaling 86,697,311 bytes**, with 14 focused browser/rendering test files. Every one of the 224 source changes since v186 is accounted for: 207 changed paths are exported and 17 source-only changes are summarized. The additional exported files supply the unchanged public dependencies and assets needed to inspect the new implementation.

## What you can inspect here

**Ownership resolution.** A read-only SolHandle adapter verifies official records and the current NFT owner through the official SDK. Reverse lookup displays only a valid Primary Handle; an explicit wallet address remains usable when identity enrichment is unavailable.

**Identity lifecycle.** The browser module handles expiry, tab backgrounding, restored pages and delayed responses. A handle transfer cannot silently redirect an existing address-based watch.

**Worlds and games.** Inspect the production planet renderer, curated catalogs, GATTO and SHEEPLE scenes and controllers, material loading, Canvas fallbacks, local travel logs and accessibility behavior. The latest snapshot includes the original generated artwork, runtime textures, fallback renders, icons and social cards, with source attribution and reproduction helpers.

**Executable checks.** Fixture tests exercise ownership transfers, invalid records, missing handles, provider failures and browser request races. Dated snapshots add focused browser and rendering checks. Provenance verification compares exported files with their recorded source hashes.

| Directory | Contents |
| --- | --- |
| [`src/`](src/) | SolHandle resolver and input validation |
| [`browser/`](browser/) | Identity-card rendering and refresh lifecycle |
| [`examples/`](examples/) | Read-only mainnet lookup |
| [`tests/`](tests/) | Offline resolver and simulated-browser checks |
| [`platform-updates/`](platform-updates/) | Dated browser-source snapshots, runtime assets, provenance and focused checks |
| [`docs/`](docs/) | Architecture, API contract, test coverage and roadmap |

## Run the kit

Use **Node.js 22.13 or newer** and npm.

```sh
git clone https://github.com/0xMichealDev/Parallax.git
cd Parallax
npm ci --ignore-scripts
npm run check
```

The check command validates source provenance and runs the included offline suites. Each dated snapshot documents its focused checks. No wallet, SOL, account credentials or RPC subscription is required for those checks.

To try a live read:

```sh
node examples/lookup.mjs @solhandle
```

The example reads Solana mainnet without signing transactions. It uses a public RPC endpoint by default; a local `SOLANA_RPC_URL` environment variable can select another provider. Never commit a credential-bearing RPC URL. See the [integration guide](docs/INTEGRATION.md) for the API contract and failure behavior.

## Three independent checks

| Check | Establishes | Does not establish |
| --- | --- | --- |
| **Handle ownership** | A wallet currently owns the official handle asset. | Project permission or token legitimacy. |
| **Wallet control** | A wallet signed a valid proof for an account. | A person's legal identity. |
| **Project authorization** | An account and its required wallet proof may perform a specific operation. | Rights for a future owner of the handle. |

This kit implements identity resolution and display. Wallet proofs and project authorization are enforced by the hosted application and are outside this source preview. Read the [architecture and trust boundaries](docs/ARCHITECTURE.md).

## Development history

The original hosted application has **162 source commits and 158 saved site versions** through the recorded October 20, 2026 snapshot. A reviewed export retains **155 historical commits** covering browser code, styles and implementation notes, with their original dates and Codex attribution.

**History import status: completed.** See the [import receipt](docs/history/import-receipt.json) for execution status and the [development record](docs/DEVELOPMENT-HISTORY.md) for scope and the source-to-import mapping. This does not reassign historical work to a personal contribution calendar.

Read the [platform guides](docs/platform/README.md) for feature details and verification limits. The active developer kit remains in the root; the historical source archive is separate and is not a runnable full application.

## Development status

The resolver and browser module are extracted from deployed PARALLAX source. [`PROVENANCE.json`](PROVENANCE.json) records their origin and SHA-256 hashes. Test scope and remaining real-device checks are documented in [Testing](docs/TESTING.md).

The [worlds and expeditions snapshot](platform-updates/worlds-expeditions-2026-10-28/) records complete export source revision `c79c3c7ff8f8e0f2a8a71a62138072a0b7433910` for workflow-only v211. Its feature release is v210 revision `b92e26dd4c0232b9c7e471a4563d40f01afe12bc`; v211 adds the release policy without changing the game runtime. The snapshot's own provenance file covers the exported browser code and assets, while the original SolHandle kit's provenance remains separate. A snapshot's recorded source revision is the reference for what has reached GitHub.

Joint partner SDK review, an authorized real NFT transfer and iPhone/Phantom signing validation remain outstanding for the broader integration. **Partner Mint is planned.** Track shipped work and future scope in the [roadmap](docs/ROADMAP.md).

## Keeping the public record current

Each hosted release should be accompanied by a reviewed update here: public browser source, required runtime assets, relevant tests and release notes tied to the exact Site source revision. Changes to private server services are summarized in the release notes; authentication services, account data, database migrations, credentials and hosting configuration stay outside the export. Earlier snapshots retain their recorded contents.

GitHub's checks verify committed snapshots. A successful Site deployment alone does not establish that its source has been published here; the dated snapshot and its provenance provide that evidence.

## Contribute and report issues

Use the issue templates for reproducible bugs and focused feature proposals. Read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a change. Suspected vulnerabilities belong in a private reporting channel described in [SECURITY.md](SECURITY.md).

Maintained by **Micheal** · [@0xMichealDev](https://x.com/0xMichealDev)  
[Community](https://t.me/Parallaxcommunity) · [Project updates](https://t.me/parallaxliveupdates)

## License and scope

This is a source preview with **no open-source license granted**. The package is marked `UNLICENSED`; dependency licenses remain their own. Source availability and passing tests are not an independent security audit, a token endorsement or a promise of investment returns.
