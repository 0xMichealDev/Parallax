# PARALLAX — The Onchain Observatory

Selected integration source and offline checks from PARALLAX, a Solana research and creator workspace.

[Website](https://parallaxlaunch.live) · [Documentation](https://parallaxlaunch.live/docs) · [SolHandle guide](https://parallaxlaunch.live/docs/solhandle)

Maintained by **Micheal**, [@0xMichealDev](https://x.com/0xMichealDev).

## Scope

This source preview includes the production SolHandle resolver, the identity-card browser module, fixture tests and a read-only mainnet lookup example. It is not the full PARALLAX application or an official SolHandle SDK. It contains no project database, deployment credentials or account data.

The resolver is transpiled from `app/solhandle-service.ts`; the browser module is copied from `public/solhandle-identity.js`. Both originate from PARALLAX source commit `7550ab3bedabeb06dea59e846fa2e57cf3a62735`. File hashes are recorded in `PROVENANCE.json`.

## Run

Use Node.js 22.13 or newer:

```sh
npm install
npm test
node examples/lookup.mjs @solhandle
```

Tests use fixture responses and require no RPC account, wallet connection or funds. The example reads mainnet and never signs transactions. Set `SOLANA_RPC_URL` in your local environment for a different RPC endpoint; keep credential-bearing URLs private. The public endpoint may rate-limit requests.

## Resolver contract

`resolveWalletQuery(input, readRpc, reverse = true)` accepts an address or `@handle`. Supply an asynchronous `readRpc(method, params)` that returns the JSON-RPC result value. The resolver allows account-read methods, bounds lookup time and uses SolHandle SDK 1.0.1 to check official records and current ownership.

Forward lookups return the current owner or a typed failure. Address input keeps the address usable when optional reverse resolution is unavailable. A stale Primary Handle cannot label the former owner after transfer. Always render the returned full address alongside the handle.

## Browser module

The module expects PARALLAX-compatible same-origin `/api/identity/` endpoints and response shapes. It is an integration reference, not a standalone widget service. Place it after your markup with `defer`, and add `data-solhandle-wallet="ADDRESS"`, `data-solhandle-project="PROFILE_ID"` or `data-solhandle-token="TOKEN_ADDRESS"` to a target element. Provide your own styling.

Cards expire from request start, invalidate on background/BFCache events, reject old responses, retain known addresses and recheck on return. Requests are deduplicated and limited to two concurrent reads. Tests cover these lifecycle boundaries with a simulated DOM; they are not a real-device browser test.

## Ownership and authorization

Handle ownership, wallet-signature verification and project permissions are independent checks. A handle transfer never authorizes access to its previous owner's project. The full application enforces account plus original-wallet authorization server-side. This selected kit contains identity resolution only; it does not implement an authorization service. Never trust a browser permission label as authorization.

## Status and use

This preview is published for inspection. No open-source license has been granted; `UNLICENSED` is intentional pending a license decision. Dependency licenses remain their own. Documentation or source availability is not an audit or a guarantee of token safety, returns or changes to external risk scores.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md) and [CHANGELOG.md](CHANGELOG.md).
