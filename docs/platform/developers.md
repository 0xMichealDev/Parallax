# Build with the evidence

Integration contracts, selected source and executable checks.

[Live guide](https://parallaxlaunch.live/docs/developers) · [Guide index](README.md)

Review how PARALLAX resolves identities and handles stale results. Start with a small, inspectable developer kit.

## Public developer kit

The kit contains the SolHandle resolver adapted directly from the deployed source, the identity-card browser module, executable offline tests, a read-only lookup example and contribution guidance. It is a selected-source release, not the full application or an official SolHandle SDK.

[Download developer kit ↓](https://parallaxlaunch.live/developer/parallax-public-kit.zip)

Public developer kit · v0.1.0

The [public GitHub repository](https://github.com/0xMichealDev/Parallax) includes architecture, integration and testing guides, a roadmap, contribution templates and automated checks on Node 22 and 24. Read the [v0.1.0 release notes](https://github.com/0xMichealDev/Parallax/releases/tag/v0.1.0) for scope and remaining validation.

## Run locally

```sh
npm ci --ignore-scripts
npm run check
node examples/lookup.mjs @solhandle
```

The tests use fixture RPC responses and do not spend SOL or sign transactions. The lookup example reads Solana mainnet; configure your own RPC endpoint locally if the public endpoint is limited.

## Read-only identity endpoints

| Endpoint | Purpose |
| --- | --- |
| `/api/identity/wallet?query=@handle` | Resolve a handle or address with identity status and check time. |
| `/api/identity/project?id=PROFILE_ID` | Read a published profile’s creator identity and viewer permission context. |
| `/api/identity/projects?token=TOKEN_ADDRESS` | Read creators of linked community profiles, without certifying token affiliation. |

These endpoints can return unavailable or rate-limited responses. Preserve address fallback and never turn a successful identity lookup into project authorization. Viewer-specific permissions require the normal authenticated site session; clients cannot declare their own identity.

## SolHandle partner review

Read the [partner handoff notes](https://parallaxlaunch.live/parallax-solhandle-handoff.md) for layout links, the SDK version, ownership boundaries and remaining joint checks. Partner Mint remains future scope.

## Contribution and security

The kit README documents its source and scope. Run its tests before proposing a change. Use fixture data in public reports. For a suspected vulnerability, request a private contact from the project team rather than posting exploit details publicly.
