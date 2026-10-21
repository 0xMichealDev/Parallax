# Dedicated Planet Atlas

The new `/planets` route makes the existing solar-system project directory a dedicated destination. It uses the existing claim, session, creator-wallet, and mission APIs. Standard claims remain free directory listings, not ownership of celestial property. No payment, token deployment, premium entitlement, or contract rules changed.

## Experience

- Eleven textured worlds: eight planets, the Moon, Europa, and Pluto.
- Interactive orbital map with real planet texture sprites, close-up mode, selected-world inspector, previous/next navigation, pause/reset, and shareable planet URLs.
- Narrow screens start with the clearer planet close-up; the full solar map remains selectable. A button-based world library provides a stationary, keyboard-accessible alternative.
- Shared WebGL planet renderer, cached map sprites, responsive close-up resolution, reduced-motion preference, pause on hover/focus, and no animation frames while offscreen or hidden. CSS texture previews remain available if WebGL fails.
- Real directory counts, project/ticker/address search, destination filter, pagination, token research and profile links, and address copying. Failed refreshes retain previous data with a visible stale-state message; failed new filters do not present false empty counts.
- Claim dialog handles sign-in, explicit Phantom message verification, wallet-owned project selection, updating/moving a spot, and release confirmation. The backend continues enforcing user and wallet ownership and unique contract addresses.
- Studio handoff preserves existing drafts, selects a destination for fresh drafts, and returns to the exact newly published project in the Atlas.
- Dashboard destination card, shared sidebar/tool finder/mobile navigation, and Explore entry updated. Existing immersive experiences remain on `/explore`. `/planets` participates in existing privacy-aware traffic counts.

## Verification

Automated coverage includes directory content escaping and safe links, selected token routing, search/pagination, refresh failure states, stale-response races, sign-in return URLs, wallet mismatch, claim update/rejection, release confirmation, reduced motion, offscreen/hidden animation suspension, geometry bounds, and malformed API responses. Creator Studio regression coverage includes Atlas handoff and draft preservation. Navigation, metadata, asset references, CSS parsing, TypeScript, and build checked before publication.

Browser visual QA is unavailable in this managed environment because the supported browser-control capability is absent. No real wallet was connected or signed, and no production claim, release, payment, token launch, or swap was performed. Production verification is read-only HTTP for the route, assets, and directory service.
