# PARALLAX workspace source snapshot

Selected source from hosted version 186, recorded October 25, 2026. See the [release record](../../docs/updates/workspace-2026-10-25.md) for shipped behavior and validation limits.

This snapshot contains 35 unmodified files from application revision `97e972053a734e5e2b394aeaab4e98a868656e3f`, covering workspace navigation, Gold presentation, Terminal layout, Premium Worlds controls and eight rendered thumbnails. `PROVENANCE.json` records each source file's SHA-256 hash.

From this directory:

```sh
node verify.mjs
node --test tests/navigation-state.test.cjs tests/terminal-workspace.test.cjs tests/workspace-usability.test.cjs
node tests/gold-experience.mjs
node tests/premium-client.mjs
```

These are offline fixture checks and do not send transactions. Shared application dependencies, server routes and original globe texture maps are omitted; this directory is not a standalone deployable site. The render helper requires the original texture maps plus Mesa EGL/OpenGL ES and Python Pillow. The committed WebP images can be inspected directly.

The earlier Terminal snapshot and historical archive are unchanged. No new source or asset license is granted.
