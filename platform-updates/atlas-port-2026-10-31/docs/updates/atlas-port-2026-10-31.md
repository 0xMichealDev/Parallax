# Atlas spacecraft and architecture collection

Project Atlas gains a dedicated six-model showcase: Atlas Station, expedition shuttle, PARALLAX Observatory, docking platform, deep-space relay and orbital habitat. The observatory collection also appears on PARALLAX's Singularity page. This is an inspectable collection of spacecraft and architectural assets, not a new walkable expedition or a replacement for the existing black-hole destination.

Each model is generated and textured with Meshy, then remeshed for web use. The common visual direction uses ivory ceramic, metal framing, dark glass and restrained gold detail. Model-specific provenance files retain task/resource lineage, reported credits, source and delivered hashes, and texture preparation details. Geometry remains unchanged during local texture packaging.

Visitors can rotate, zoom, pause motion, change lighting and expand the selected model. Only one model is resident at a time in a shared graphics context. Loading begins on approach; frames stop offscreen and in hidden tabs. Reduced motion starts paused. Stale downloads cannot overwrite a newer selection; context loss and loading errors retain an inspected rendered preview and expose Retry 3D. Project search, filters, directory and solar-system controls remain separate.

The desktop Earth maps are prepared at the renderer's existing 4096-pixel cap before transfer, retaining their original attribution and archived 8K sources. Deployment packaging omits those replaced 8K files and the unused PNG source of the deployed expedition WebP. The complete build is checked against the hosting archive limit.

Validation includes model parsing, finite bounds, triangle and delivery-size budgets, camera basis and framing, lazy loading, stale completion, error fallback, tab visibility, context loss and the existing Atlas directory/solar interaction checks. Native Edge control ended because the tool could not confidently identify the current browser URL; no further computer control was attempted in that turn. The model thumbnails were visually inspected, but the complete browser presentation has not been visually verified.

Budget: up to 300 credits authorized. Final charges and task records are recorded in assets/atlas-port/manifest.json and each asset's provenance.json.
