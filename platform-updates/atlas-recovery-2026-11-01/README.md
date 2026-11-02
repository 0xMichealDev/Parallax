# Atlas graphics recovery — v243

Deployed native revision: 85e6bb57eb659b3d2981c97f052a30db2d056ce9.

Recovers the shared planet renderer after temporary WebGL interruption. Regression tests cover three loss/restore cycles and texture rebuilding. Existing Atlas checks and production build pass. Final forced-loss visual check was blocked by Edge automation; this does not claim every intermittent freeze is resolved. No paid assets.

Run npm run check:atlas-recovery. See docs/updates/atlas-recovery-2026-11-01.md.
