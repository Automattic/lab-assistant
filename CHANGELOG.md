0.3.0
==========

- UPDATE: Require Node.js 22.19 or newer.
- UPDATE: Update dependencies (Puppeteer 25, Lighthouse 13, yargs 18).
- UPDATE: Validate that `--repeat` is at least 2 and `--throwaway` is non-negative.
- NEW: Add automated tests (`npm test`).
- NEW: Add `--network` option to choose a network throttling profile. Throttling isn't available for the `ttfb` metric.
- UPDATE: Network throttling is now off by default. Use `--network legacy` for the previous behaviour.
- NEW: Add `--wait` and `--wait_extra` options to choose how long to wait before taking measurements, which helps capture late LCP and layout shifts (direct measuring only).
- BUGFIX: Wait for the viewport to be set and the browser to close between measurements.
- BUGFIX: Wait for paint timings to be recorded before measuring, so FP, FCP and LCP are no longer missing on pages that load before their first paint.
- BUGFIX: Use a two-sided t-test. Choosing a one-sided test from the observed means halved the p-value, so twice as many differences were reported as significant as should have been.
- BUGFIX: Don't exit with a NaN p-value error when every measurement within each version is identical.
- BUGFIX: Don't report infinite changes when a mean is zero.
- BUGFIX: Exit with an error when the chosen metric isn't recorded, instead of counting a missing LCP as 0ms.
- BUGFIX: Calculate CLS with session windows, matching the current definition and Lighthouse, instead of adding up every layout shift (direct measuring only).
- UPDATE: Report the sample standard deviation rather than the population standard deviation.
- UPDATE: Report the size of a change as a speedup or slowdown factor instead of "% faster" / "% slower".
- UPDATE: Describe CLS and TBT changes in terms of layout shift and blocking time, as an absolute difference between means.
- UPDATE: Minor wording changes for clarity.
- UPDATE: Lighthouse mode now uses DevTools throttling instead of simulated throttling.
- NEW: Add `--screen` option to choose the emulated screen, from a set of profiles or a custom size, in both direct and Lighthouse modes. The default is now Lighthouse's desktop size (1350x940) instead of 1920x1200.

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
