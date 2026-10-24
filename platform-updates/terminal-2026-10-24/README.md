# Terminal browser snapshot — October 24, 2026

Selected public browser assets and Terminal markup from hosted PARALLAX version 179. See [release notes](../../docs/updates/terminal-2026-10-24.md) for features, source behavior and validation limits.

`PROVENANCE.json` records the source revision and SHA-256 hash of each copied file. Exported files are unmodified. The verifier and this README are documentation tooling added for the public repository.

## Run the focused checks

From the repository root:

```sh
npm run check:terminal
```

Or from this directory, with Node.js 22.13 or newer:

```sh
node verify.mjs
node --test tests/terminal-workspace.test.cjs tests/terminal-amount.test.cjs
```

These nine checks use DOM and VM fixtures; no installation, credentials, RPC access or wallet is needed. They cover amount parsing, accessible workspace navigation, deep links and chart focus, not live provider responses or transaction execution.

## Integration boundaries

This snapshot is **not a standalone application**. The markup and browser modules depend on the hosted site's server APIs, common styles, shared scripts, chart vendor assets and wallet integrations. Those dependencies are not bundled here. The API services and full application remain separately maintained.

The source preserves original asset references, including cache-busting versions. Do not infer server implementation or deployability from these browser files. The repository's existing `UNLICENSED` scope applies.
