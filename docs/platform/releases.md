# Release notes

A concise record of changes people can use.

[Live guide](https://parallaxlaunch.live/docs/releases) · [Guide index](README.md)

User-facing changes, with verification limits kept beside the release.

## October 21, 2026 · Public documentation

Added a public documentation hub, searchable guides, direct tool links, Gold eligibility and usage details, SolHandle integration notes, and a status-led roadmap. A downloadable developer kit contains selected integration source and executable tests.

The [PARALLAX GitHub repository](https://github.com/0xMichealDev/Parallax) is public. The [v0.1.0 developer kit](https://github.com/0xMichealDev/Parallax/releases/tag/v0.1.0) includes selected SolHandle integration code, offline tests, source provenance checks, a dependency lockfile and CI on Node 22 and 24. The downloadable ZIP matches the public release contents. This is selected integration source, not the full application or an independent audit.

## October 20, 2026 · SolHandle refresh

Identity cards invalidate when backgrounded and recheck on return. Older in-flight responses cannot restore invalidated labels. Creator addresses stay visible during refresh and expiry. Wallet snapshots and replay distinguish historical handle observations from current identity.

Automated checks cover transfer behavior, stale Primary Handles, request races, address pinning and actual project-update authorization. Mainnet forward lookup and no-Primary-Handle fallback were checked. Real transfer and device-signature tests remain outstanding.

## October 20, 2026 · Gold research

Gold Assistant provides saved-report explanations, same-token snapshot comparisons, follow-up questions and private conversations with source references. Gold styling and membership presentation identify active access. See [Gold membership](https://parallaxlaunch.live/docs/gold) for eligibility and limits.

Automated AI tests use fixtures. A production model-response walkthrough requires a signed-in eligible member; no claim of independent AI accuracy certification is made.
