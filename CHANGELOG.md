Unreleased
==========

- UPDATE: Require Node.js 22.19 or newer.
- UPDATE: Update dependencies (Puppeteer 25, Lighthouse 13, yargs 18).
- UPDATE: Validate that `--repeat` is at least 2 and `--throwaway` is non-negative.
- NEW: Add automated tests (`npm test`).
- BUGFIX: Wait for the viewport to be set and the browser to close between measurements.

0.2.0
=====

- NEW: Add support for measuring with Lighthouse.
- NEW: Add support for Largest Contentful Paint metric.
- NEW: Add support for Cumulative Layout Shift metric.
- NEW: Add support for Time to Interactive metric (Lighthouse only).
- NEW: Add support for Total Blocking Time (Lighthouse only).
- UPDATE: Update dependencies.
- BUGFIX: Solve some issues on datasets with zero variability.
- BUGFIX: Fix % faster / % slower calculations.

0.1.2
=====

- BUGFIX: Remove some testing configuration that made it to the release.

0.1.1
=====

- BUGFIX: Configure lab-assistant to work correctly as an NPM CLI tool.

0.1.0
=====

Initial release.
