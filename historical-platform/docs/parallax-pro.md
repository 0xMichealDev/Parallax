# Parallax Pro holder access

Launch threshold: 100,000 PRLX, mint `8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump`.

`/pro` uses existing ChatGPT sign-in and signed Phantom ownership proofs. Each status/scan reads the authenticated user's unexpired wallet identity from D1. Mainnet genesis, mint metadata and all directly owned token accounts are checked through the existing server RPC configuration. Balances are summed as integers; caller-supplied wallets or balances cannot grant access. Failed verification fails closed. No payments, approvals, staking or transfers are performed. Locked/custodied tokens do not count.

`POST /api/pro/scan` gates the combined monitor server-side. Five wallets and five project tokens per scan; 90 status/scan requests per account per UTC hour. Wallet data is native SOL plus ten recent transaction signatures. Project data uses the existing source-linked Passport collector. Data failures are shown per item. Basic public research and existing tools remain available.

Watchlists are saved locally per verified wallet, not synced across devices. Change notices compare successful refreshes in the current page session. Optional auto refresh runs every 60 seconds only while visible. No background notification delivery is included. Price notices require the same market pair. JSON exports contain the latest monitored data, not a wallet signature or session credential.

Premium Worlds and planet growth remain independent purchases. Subscription checkout is not included.

Validation: `node tests/holder-pro.mjs`, `node tests/wallet-api.mjs`, JavaScript syntax check, framework production build. Holder tests cover exact threshold and one-unit-below, aggregated accounts, wrong mint/owner/decimals, duplicate accounts, mainnet validation, provider failure, client spoofing, origin, account isolation, expired proof, wallet switch, balance revocation, data response and quota. Browser/Phantom end-to-end testing is unavailable in this environment. Repository-wide TypeScript checking reports an existing QRCode option mismatch in `app/growth-service.ts:33`; no Pro errors were reported.
