# Testing and validation

Install the lockfile dependencies and run the same checks as CI:

```sh
npm ci --ignore-scripts
npm run check
```

`npm run check` runs source provenance verification and Node's test runner. Tests use fixture RPC responses and a simulated browser DOM; they do not spend SOL or make live RPC calls.

## Coverage

| Area | Checked behavior |
| --- | --- |
| Input | Normalization and invalid handle/address rejection |
| Forward resolution | Current owner and verified identity fields |
| Reverse resolution | Valid Primary Handle and stale-owner rejection |
| Transfer | Fresh forward lookup reflects the new owner |
| Official records | Invalid program, collection or protocol version is rejected |
| Availability | Missing/retired assets and provider errors preserve the appropriate failure boundary |
| Browser lifecycle | Backgrounding, BFCache, identity expiry and fresh resume |
| Races | An older or delayed response cannot restore an expired label |
| Addresses | Known creator addresses survive label expiry |
| Request pressure | Deduplication and a two-request concurrency limit |
| Provenance | Extracted production modules match the recorded SHA-256 hashes |

The CI workflow uses a clean dependency install on Node 22 and 24. It does not need repository secrets or wallet credentials. It runs on pushes and pull requests with read-only repository permissions.

## What these checks do not prove

They do not establish a real-device browser pass, live RPC availability, end-to-end Telegram delivery, wallet-signature correctness, project-authorization correctness or independent audit status. Those services are outside this selected source preview.

## Remaining integration checks

- Joint review of the dedicated partner SDK package.
- An authorized real NFT transfer with forward and reverse rechecks.
- iPhone/Phantom wallet-signature walkthroughs in the hosted platform.

Use the hosted [SolHandle guide](https://parallaxlaunch.live/docs/solhandle) for deployment context and dates. A manual live lookup can be run with `node examples/lookup.mjs @solhandle`; do not interpret a successful lookup as certification of the entire integration.
