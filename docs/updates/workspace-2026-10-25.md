# Workspace, Gold and Premium Worlds update — October 25, 2026

[Open PARALLAX](https://parallaxlaunch.live) · [Selected source](../../platform-updates/workspace-2026-10-25/)

This records the work shipped after the [Terminal v179 release](terminal-2026-10-24.md), through hosted version 186, application revision `97e972053a734e5e2b394aeaab4e98a868656e3f`.

## What shipped

- **My Workspace:** a dedicated starting page for saved tokens, watched wallets, alert settings and research reports, with a link to the activity briefing. Labels distinguish device-saved tokens from account-saved information and identify sign-in requirements.
- **Navigation:** consistent workspace links and section highlighting across research pages, plus clearer access to the existing customizable dashboard.
- **Gold:** a shorter membership page with access information and grouped tool links. Secondary explanations are expandable, and verified membership still controls the Gold presentation.
- **Wallet Watch and Observatory:** compact headings and cleaner spacing to make the working areas easier to reach.
- **Terminal:** visible research tabs, a chart-height fix when expanding research, and corrected native disclosure behavior. Missing valuation data can be filled from a matching provider response for the exact mint and pool; observed zeroes and the distinction between market cap and FDV are preserved. Missing data is not guaranteed to be available.
- **Premium Worlds:** single-row surface choices with separate thumbnail, label and selection indicator; collapsible complete looks, advanced controls and feature comparison; simpler mobile spacing and header controls.
- **Planet previews:** eight 256-pixel WebP thumbnails replace geometric gradient icons. The five surfaces and three environments use textured renders with directional lighting and shadows. These small images do not require eight live WebGL renderers. The interactive production shader is unchanged.

## Verification

The hosted production build passed. The new exported snapshot passes all 18 navigation, Terminal workspace and disclosure tests, the Gold client harness and all Premium client scenarios. Those scenarios cover preview selection, explicit payment initiation, duplicate-submission protection, returning purchases, style saving and legacy receipt recovery using simulated fixtures. They do not execute real payments.

The live desktop page loaded all eight new thumbnails, and surface selection was checked. The cloud test browser did not support the enhanced 3D preview; that limitation is separate from the baked thumbnails. Real-device iPhone validation and a live payment were not performed for this update.

Run `npm run check:workspace` from the repository root to verify the 35 exported files against their source hashes and rerun the included checks.

## Public source scope

This is a dated selected-source snapshot, consistent with the existing developer kit. It includes changed browser source and page markup, shared shell rendering, the thumbnail-generation helper, the eight rendered images and focused client tests. Backend valuation improvements are documented above; server services, account data, credentials, hosting configuration and a complete deployment are not part of this export. Existing historical snapshots remain intact.

The asset helper is provided for inspection. Regenerating thumbnails also requires Mesa EGL/OpenGL ES, Python Pillow and the original globe texture assets, which are not bundled here. Source availability does not grant a new license to this code or third-party assets.

## Continuing work

The ongoing focus is easier navigation, clearer research tools, responsive layouts and visual polish. Larger additions will be announced with concrete details as they are ready. This release does not announce a mobile-app launch or new AI capabilities.
