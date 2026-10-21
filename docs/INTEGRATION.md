# SolHandle integration guide

## Resolver API

```js
import {resolveWalletQuery, parseWalletQuery} from '../src/solhandle.mjs';

const query = parseWalletQuery(' @Parallax ');
// { kind: 'handle', value: '@parallax' }

const result = await resolveWalletQuery(input, readRpc);
```

`readRpc(method, params)` must return the JSON-RPC **result value**, not the full response envelope. The [lookup example](../examples/lookup.mjs) provides a small HTTP implementation with a request timeout. Keep provider credentials server-side.

The resolver returns an object containing an `address` and an `identity`. Identity fields are:

| Field | Meaning |
| --- | --- |
| `provider` | `SolHandle` |
| `network` | `mainnet-beta` |
| `status` | `resolved`, `not-set` or `unavailable` |
| `lookup` | `forward` for handle input; `primary` for address input |
| `handle` | Verified handle, or `null` |
| `assetAddress` | Verified handle asset, or `null` |
| `checkedAt` | ISO timestamp for the completed check |

Passing `reverse = false` for an address skips optional enrichment and returns `identity: null`. Display the full returned address alongside a resolved handle.

## Failure behavior

| Input / outcome | Result |
| --- | --- |
| Invalid input | `WalletIdentityError` with status `400` |
| Forward handle not found | Status `404`; no address selected |
| Forward record cannot be verified | Status `422`; no address selected |
| Forward provider failure | Status `503`; no address selected |
| Address without a valid Primary Handle | Address preserved; identity `not-set` |
| Address with reverse lookup failure | Address preserved; identity `unavailable` |

`error.status` is a property of the thrown error, not an HTTP response emitted by this module. Your server decides how to map it to a response. The public errors avoid exposing provider failure details.

## Browser adapter

Load the module after markup or with `defer`:

```html
<div data-solhandle-wallet="FULL_SOLANA_ADDRESS"></div>
<script src="/solhandle-identity.js" defer></script>
```

Available target attributes:

| Attribute | Same-origin endpoint | Expected response |
| --- | --- | --- |
| `data-solhandle-wallet` | `/api/identity/wallet?query=...` | `{address, identity}` |
| `data-solhandle-project` | `/api/identity/project?id=...` | `{project, creator, projectPermissions}` |
| `data-solhandle-token` | `/api/identity/projects?token=...` | `{projects, hasMore}` |

Project entries use `project.name`, `project.href`, `creator.address`, `creator.identity`, and `projectPermissions.canManage` / `status`. Supported display statuses include `creator-wallet-required` and `sign-in-required`. `data-solhandle-compact="true"` suppresses permission detail for an individual project card. Supply your own CSS for the module's classes.

The module uses DOM text content for labels. Server-generated project links still need validation: only return approved relative paths or URLs. Do not trust incoming identity JSON as authorization.

## Saving a watch

Resolve a handle, show the full address and require the save operation to verify that the current owner still matches the reviewed address. Persist that exact address as the watch target. Do not resolve the handle afresh later and silently switch an existing watch to a new owner. This save workflow belongs in the host application, outside this kit.

## Supported scope

The extracted adapter targets the pinned SolHandle SDK version in `package.json`. A future SDK update requires compatibility review and fresh test results. Partner Mint, payments, signing and NFT transfer execution are not implemented here.
