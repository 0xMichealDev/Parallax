# SolHandle integration

Recognizable handles with independent ownership and access checks.

[Live guide](https://parallaxlaunch.live/docs/solhandle) · [Guide index](README.md)

SolHandle adds readable @handles beside Solana addresses in Wallet Watch, Project Atlas and Project Passports.

## Two directions of lookup

**@handle → wallet:** the official SDK verifies the current NFT owner. **Wallet → @handle:** only a currently owned Primary Handle is shown. If no valid Primary Handle is found, the address remains available.

## Three separate checks

| Check | What it establishes |
| --- | --- |
| Handle ownership | The wallet currently owns the official SolHandle asset. |
| Wallet control | A signed proof links an exact wallet to a PARALLAX account for a limited period. |
| Project permission | The original creator account and a current proof for the recorded project wallet authorize supported changes. |

Owning a handle does not prove token affiliation, project legitimacy or editing permission.

## What happens after a transfer

The next forward lookup resolves the new owner. A stale Primary Handle cannot keep labeling the previous wallet. Existing watchlists, project access and wallet proofs stay tied to their recorded identities.

Identity cards expire within one minute of request start. They clear when the page is backgrounded and recheck when you return into view. Addresses remain available while checks refresh. Historical lookup labels are identified separately.

## Current integration status

Live Lookup, identity display and the integration page are deployed. Automated ownership-transfer and permission tests pass; a public mainnet forward lookup and no-Primary-Handle fallback were checked on October 20, 2026.

Joint validation The dedicated partner SDK package, authorized real NFT transfer and iPhone/Phantom signing walkthrough remain to be reviewed or tested together. No official SolHandle certification is claimed.

Planned Partner Mint is a later phase. You cannot mint a handle inside PARALLAX yet.

[Try the integration ↗](https://parallaxlaunch.live/solhandle)
