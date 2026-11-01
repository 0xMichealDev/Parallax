# Hosted v238

Deployed source: f6b18634c0d0c104a1146a964b04c81f488698c2.

# Orbital command dashboard

The customizable dashboard at `/?view=dashboard` now opens with an orbital citadel, three clear Research / Create / Explore destinations, and a compact PRLX contract section. It replaces the large scroll-driven background video. Existing saved layouts, ten dashboard panels, official contract controls and tool routes remain available.

Three Meshy assets were generated for this release: citadel, docking concourse and communications array. Their task lineage, actual charges and geometry-preservation evidence are exported with the assets. The existing Atlas shuttle and observatory are reused. The citadel and shuttle share an opt-in live scene; all destination links work without WebGL. Motion starts only on request and stops for hidden tabs, offscreen scenes and reduced-motion preferences. GPU context loss returns to the rendered preview with an explicit retry.

Validation includes desktop and narrow-screen browser inspection, the no-WebGL fallback, scene lifecycle and model-budget checks, existing dashboard focus/motion checks, saved-layout client checks and the production build. The in-app browser cannot render WebGL, so full GPU appearance is not visually verified here. Rendered Meshy previews were inspected individually.

Archived source media remains in the native repository. Three newly unreferenced dashboard videos are excluded from the deployment package to make room for the models.
