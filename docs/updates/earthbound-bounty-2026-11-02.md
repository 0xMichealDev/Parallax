# Hosted v252

Deployed source: 90eadf2d3b567717288438f840c577914a40db7f.

# Earthbound bounty practice

Separate anonymous practice lobbies support up to 15 connections. Each player explicitly enters with 5 free practice credits. Two entries begin a 15-second countdown; a round lasts up to 10 minutes. Late arrivals watch until the next round. Eliminated and extracted players cannot re-enter that round.

The server owns projectile hits, transfers the victim's entire carried bounty once, and settles extraction once. Extraction opens after 30 seconds at the camp marker (0, 3), radius 7 meters, and requires 8 uninterrupted seconds. Movement, jumping, firing or damage interrupts it. Camp is not protected in bounty mode; arrival protection lasts 3 seconds. Vehicles, flight, fast travel and solo range are unavailable. Free exploration retains its existing protection and respawn behavior.

Leaving/disconnecting forfeits carried credits to an active attacker from the previous 10 seconds, or to the round's unclaimed total. Remaining carried credits become unclaimed at timeout. Results show after all entries finish, then return to the lobby after 20 seconds. Credits have no monetary value and no connection to PRLX. There are no wallet prompts, deposits or withdrawal endpoints. Results are ephemeral; leaving or server restart clears session totals.

Tests cover pool conservation, duplicate entry and extraction, kill transfer, both extraction interruptions and release paths, spectator restrictions, timeout/reset, and unchanged free-play behavior. Live two-client validation is recorded in the public release notes. This is a prototype, not a competitive anti-cheat system or a money-ready ledger.
