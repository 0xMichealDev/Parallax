# Dashboard cinematic journey — v260

Deployed native revision: 6482b0e18afa9d546f2bcdd36a3ca65fe17e1f8d.

The dashboard has a dedicated scroll-controlled cinematic section with chapter navigation and direct destinations. The flight controller keeps navigation usable when motion is paused, reduced motion is requested, or video loading fails.

The exact native release note records shipped behavior, actual media provenance and costs, validation, and remaining limitations: [release note](docs/updates/dashboard-journey-2026-11-03.md). No native deployment credentials or private service source are included. Existing Meshy model assets are retained as focused-test dependencies; their inclusion does not indicate new generation spend.

Run `npm run check:dashboard-journey` from the public repository root. This runs the two focused browser suites. The exported site-integrity audit is provided as a source reference; its full native page audit requires application dependencies intentionally omitted from this public snapshot and is not run by the public check. The public snapshot is a reviewed source excerpt, not a complete runnable application.
