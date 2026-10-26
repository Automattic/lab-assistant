#!/usr/bin/env node
/**
 *  Main file for lab-assistant.
 */

const puppeteer = require("puppeteer");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const readline = require("readline");
const { setTimeout: sleep } = require("node:timers/promises");
const Progress = require("cli-progress");

const {
  analyseResults,
  calculateMean,
  calculateStandardDeviation,
  round,
} = require("./math.js");
const { networkProfiles } = require("./network.js");
const { verbose, setOutputOptions } = require("./output.js");
const { calculateLCP, calculateCLS } = require("./web-vitals.js");

let options;

// The Puppeteer navigation events to wait for, for each `--wait` point.
const waitPoints = {
  load: "load",
  "network-idle": ["load", "networkidle0"],
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Returns a promise that only resolves once the user presses <Enter>.
 *
 * @returns {Promise} The user input promise.
 */
function waitForInput() {
  return new Promise((resolve, reject) => rl.question("", () => resolve()));
}

/**
 * Initialises a Puppeteer Browser object and returns it.
 *
 * @returns {Browser} The initialised Browser object.
 */
async function initBrowser() {
  const browser = await puppeteer.launch({
    headless: options.headless,
  });

  return browser;
}

/**
 * Initialises a Puppeteer Page object and returns it, along with a Client.
 *
 * @param {Browser} browser A Puppeteer Browser object.
 *
 * @returns {{ page: Page, client: Client }} An object with the initialised Page and Client.
 */
async function initPage(browser) {
  const page = await browser.newPage();
  const client = await page.target().createCDPSession();

  if (options.cpu_slowdown) {
    await client.send("Emulation.setCPUThrottlingRate", {
      rate: options.cpu_slowdown,
    });
  }

  await page.emulateNetworkConditions(
    networkProfiles[options.network]
  );

  await page.setViewport({
    width: 1920,
    height: 1200,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
    isLandscape: true,
  });

  await page.setCacheEnabled(false);

  return { page, client };
}

/**
 * Handles an error obtained while attempting to fetch a page.
 *
 * @param {Error} e The Puppeteer-provided error.
 */
function handleFetchError(e) {
  console.error("\n");
  console.error("Error fetching page.");
  console.error(e);
  console.error("\nExiting.");
  process.exit(-1);
}

/**
 * Handles a page load that didn't record the desired metric.
 *
 * @param {String} url The URL that was loaded.
 */
function handleMissingMetric(url) {
  console.error("\n");
  console.error(`Error: the \`${options.metric}\` metric wasn't recorded for ${url}.`);
  if (!options.lighthouse) {
    console.error(
      "The page may not have painted its content in time, or may have no " +
        "content for this metric. Consider using `--wait network-idle` or " +
        "`--wait_extra`."
    );
  }
  console.error("\nExiting.");
  process.exit(-1);
}

/**
 * Loads a page in Puppeteer, without doing anything with it.
 * Used for throwaway requests that help improve result consistency.
 *
 * @param {String} url The URL to load.
 */
async function load(url) {
  const browser = await initBrowser();
  const { page } = await initPage(browser);

  try {
    await page.goto(url);
  } catch (e) {
    handleFetchError(e);
  }

  await teardown(browser);
}

/**
 * Loads a page in Puppeteer and takes several measurements with Lighthouse.
 *
 * @param {String} url The URL to load.
 *
 * @returns {Metrics} An object with multiple performance timings.
 */
async function loadAndMeasureWithLighthouse(url) {
  const browser = await initBrowser();
  const { page } = await initPage(browser);
  const { UserFlow } = await import("lighthouse/core/user-flow.js");
  const flow = new UserFlow(page, { name: "Navigation" });

  try {
    await flow.navigate(url);
  } catch (e) {
    handleFetchError(e);
  }

  await teardown(browser);

  const result = await flow.createFlowResult();

  const metricsDetails = result.steps[0].lhr.audits[
    "metrics"
  ].details.items.find((item) => "interactive" in item);

  const metrics = {
    cls: result.steps[0].lhr.audits["cumulative-layout-shift"].numericValue,
    fcp: result.steps[0].lhr.audits["first-contentful-paint"].numericValue,
    lcp: result.steps[0].lhr.audits["largest-contentful-paint"].numericValue,
    tbt: result.steps[0].lhr.audits["total-blocking-time"].numericValue,
    tti: result.steps[0].lhr.audits["interactive"].numericValue,
    ttfb: result.steps[0].lhr.audits["server-response-time"].numericValue,
    fp: metricsDetails.observedFirstPaint,
    dcl: metricsDetails.observedDomContentLoaded,
    load: metricsDetails.observedLoad,
  };

  return metrics;
}

/**
 * Waits for the page to render its next frame, and then for any further frames
 * needed until paint timings are recorded (up to a limit). This ensures they're
 * available even when the load event fires before the first paint, since
 * timings are only recorded once a frame is presented, which can lag behind.
 *
 * @param {Page} page A Puppeteer Page object.
 */
async function waitForPaintTimings(page) {
  await page.evaluate(async () => {
    const deadline = performance.now() + 1000;

    do {
      await new Promise((resolve) =>
        requestAnimationFrame(() => setTimeout(resolve))
      );
    } while (
      (performance.getEntriesByType("paint").length < 2 ||
        !window.largestContentfulPaint) &&
      performance.now() < deadline
    );
  });
}

/**
 * Loads a page in Puppeteer and takes several measurements during load.
 *
 * @param {String} url The URL to load.
 *
 * @returns {Metrics} An object with multiple performance timings.
 */
async function loadAndMeasureDirectly(url) {
  const browser = await initBrowser();
  const { page } = await initPage(browser);

  await page.evaluateOnNewDocument(calculateLCP);
  await page.evaluateOnNewDocument(calculateCLS);

  try {
    await page.goto(url, { waitUntil: waitPoints[options.wait] });
  } catch (e) {
    handleFetchError(e);
  }

  await sleep(options.wait_extra * 1000);
  await waitForPaintTimings(page);

  const navigation = JSON.parse(
    await page.evaluate(() =>
      JSON.stringify(performance.getEntriesByType("navigation")[0].toJSON())
    )
  );

  const paint = await page.evaluate(() => {
    const paintEntries = performance.getEntriesByType("paint");
    return paintEntries.reduce(
      (obj, entry) => ({
        ...obj,
        [entry.name]: entry.startTime,
      }),
      {}
    );
  });

  const lcp = await page.evaluate(() => {
    return window.largestContentfulPaint;
  });

  const cls = await page.evaluate(() => {
    return window.cumulativeLayoutShiftScore;
  });

  await teardown(browser);

  return {
    ttfb: navigation.responseStart,
    dcl: navigation.domContentLoadedEventEnd,
    load: navigation.loadEventEnd,
    fp: paint["first-paint"],
    fcp: paint["first-contentful-paint"],
    lcp,
    cls,
  };
}

async function loadAndMeasure(url) {
  if (options.lighthouse) {
    return loadAndMeasureWithLighthouse(url);
  }

  return loadAndMeasureDirectly(url);
}

/**
 * Takes a set of browser timings as returned by `loadAndMeasure` and returns
 * the desired metric.
 *
 * @param {{ navigation: Object, paint: Object }} timings The timings object.
 * @param {String} metric The desired metric, as described in the `metric`
 * command-line option description.
 *
 * @return {Number} The desired metric value.
 */
function calculateMetric(timings, metric) {
  return timings[metric];
}

/**
 * Closes a Puppeteer Browser instance.
 *
 * @param {Browser} browser The Browser instance to close.
 */
async function teardown(browser) {
  await browser.close();
}

/**
 * Format a metric value for display.
 *
 * @param {Number} value The value to format.
 * @return {String} The formatted value.
 */
function formatMetric(value) {
  if (options.metric === "cls") {
    return `${round(value, 4)}`;
  }

  return `${round(value)}ms`;
}

/**
 * Performs a set of measurements for a given version.
 *
 * @param {Array} timingSet Output parameter. An empty array into which timings
 * will be placed.
 * @param {String} versionString The version to run measurements for.
 *
 * @return {Array<Number>} The metric value for each page load within the set.
 */
async function performMeasurementSet(timingSet, versionString, url) {
  const progress = new Progress.Bar({}, Progress.Presets.shades_classic);
  progress.start(options.repeat, 0);

  for (let i = 0; i < options.throwaway; i++) {
    await load(url);
  }

  for (let i = 0; i < options.repeat; i++) {
    const timings = await loadAndMeasure(url);
    if (!Number.isFinite(calculateMetric(timings, options.metric))) {
      handleMissingMetric(url);
    }
    timingSet.push(timings);
    progress.update(i + 1);
  }
  progress.stop();

  const values = timingSet.map((timings) =>
    calculateMetric(timings, options.metric)
  );
  const mean = calculateMean(values);

  console.log();
  console.log(`Test results for ${versionString} version (${url})`);
  verbose("Values: ", values);
  console.log(`Mean: ${formatMetric(mean)}`);
  console.log(
    `Standard deviation: ${formatMetric(
      calculateStandardDeviation(values, mean)
    )}`
  );
  const [maxLabel, minLabel] =
    ["cls", "tbt"].includes(options.metric)
      ? ["Highest", "Lowest"]
      : ["Slowest", "Fastest"];
  console.log(`${maxLabel} measurement: ${formatMetric(Math.max(...values))}`);
  console.log(`${minLabel} measurement: ${formatMetric(Math.min(...values))}`);
  console.log();

  return values;
}

/**
 * Main method for the tool.
 */
(async () => {
  options = yargs(hideBin(process.argv))
    .command("$0 <url> [url2]", "", (yargs) =>
      yargs
        .positional("url", {
          describe: `URL to fetch content from.
				If \`url2\` is not specified, this is used for both the new and old
				versions, with the application pausing in between to allow for the
				version swap.`,
        })
        .positional("url2", {
          describe: `Second URL to fetch content from.
				If specified, this refers to the new version, while \`url\` refers to
				the old version.`,
        })
    )
    .option("verbose", {
      alias: "v",
      type: "boolean",
      default: false,
      describe: "Output more details.",
    })
    .option("headless", {
      type: "boolean",
      default: true,
      describe: "Whether to use a headless browser.",
    })
    .option("lighthouse", {
      alias: "l",
      type: "boolean",
      default: false,
      describe: `Whether to run the tests through Lighthouse.
			Measuring through Lighthouse is significantly slower, and the results aren't comparable to direct measuring.`,
    })
    .option("repeat", {
      alias: "r",
      type: "number",
      default: 10,
      describe:
        "The number of measurements to take for each version. Must be at least 2.",
    })
    .option("throwaway", {
      alias: "t",
      type: "number",
      default: 1,
      describe: `The number of throwaway visits to perform before any actual measurements.
			Keeping it at 1 or increasing the value can help with stability.`,
    })
    .option("cpu_slowdown", {
      alias: "c",
      type: "number",
      describe:
        "The CPU slowdown throttling to apply (may help achieve more stable results in CPU-heavy pages).",
    })
    .option("network", {
      alias: "n",
      type: "string",
      describe: "The network throttling to apply.\n" +
			"Throttling can't be combined with `ttfb` or Lighthouse.\n" +
			`Profiles:
			- none: No throttling
			- fast-4g: 8.1 Mbps down, 1.35 Mbps up, 165ms latency (DevTools "Fast 4G")
			- slow-4g: 1.44 Mbps down, 675 kbps up, 562.5ms latency (DevTools "Slow 4G")
			- slow-3g: 400 kbps down, 400 kbps up, 2000ms latency (DevTools "3G")
			- legacy: 1.68 Mbps down, 786 kbps up, 150ms latency`,
      default: "none",
      choices: Object.keys(networkProfiles),
    })
    .option("wait", {
      alias: "w",
      type: "string",
      describe: "The point to wait for before taking measurements.\n" +
			"Can't be changed in Lighthouse mode.\n" +
			`Points:
			- load: The load event
			- network-idle: load, then no network requests for 500ms`,
      default: "load",
      choices: Object.keys(waitPoints),
    })
    .option("wait_extra", {
      type: "number",
      describe: `Additional seconds to wait after the \`--wait\` point (may help capture late LCP and layout shifts).
			Can't be changed in Lighthouse mode.`,
      default: 0,
    })
    .option("metric", {
      alias: "m",
      type: "string",
      describe: 'The metric to consider.\n' +
			`Metrics:
			- ttfb: Time to First Byte (unthrottled network only)
			- fp: First Paint
			- fcp: First Contentful Paint
			- dcl: Time to DOMContentLoad event end
			- load: Time to Load event end
			- lcp: Largest Contentful Paint
			- cls: Cumulative Layout Shift
			- tti: Time To Interactive (Lighthouse only)
			- tbt: Total Blocking Time (Lighthouse only)`,
      default: "load",
      choices: ["ttfb", "fp", "fcp", "dcl", "load", "lcp", "cls", "tti", "tbt"],
    })
    .check((argv) => {
      if (argv.lighthouse && argv.network !== "none") {
        throw new Error(
          "Network throttling is only available when measuring directly. Lighthouse applies its own."
        );
      }

      if (argv.metric === "ttfb" && argv.network !== "none") {
        throw new Error(
          "The `ttfb` metric can't be combined with network throttling, due to limitations in the Chrome throttling implementation"
        );
      }

      if (argv.lighthouse && (argv.wait !== "load" || argv.wait_extra !== 0)) {
        throw new Error(
          "Waiting options are only available when measuring directly. Lighthouse has its own waiting logic."
        );
      }

      if (!(argv.wait_extra >= 0)) {
        throw new Error("wait_extra must be a non-negative number of seconds.");
      }

      return true;
    })
    .version(false).argv;

  const oldTimings = [];
  const newTimings = [];

  const oldUrl = options.url;
  const newUrl = options.url2 || options.url;

  if (
    !options.lighthouse &&
    (options.metric === "tti" || options.metric === "tbt")
  ) {
    console.error(
      "Error: metric only measurable via Lighthouse. Use the `-l` option."
    );
    process.exit(-1);
  }

  if (!Number.isInteger(options.repeat) || options.repeat < 2) {
    console.error("Error: repeat must be an integer of at least 2.");
    process.exit(-1);
  }

  if (!Number.isInteger(options.throwaway) || options.throwaway < 0) {
    console.error("Error: throwaway must be a non-negative integer.");
    process.exit(-1);
  }

  setOutputOptions(options);

  if (!options.url2) {
    console.log(
      "Press <Enter> when ready for taking measurements on the OLD version."
    );
    await waitForInput();
  }

  const oldValues = await performMeasurementSet(oldTimings, "old", oldUrl);

  console.log();

  if (!options.url2) {
    console.log(
      "Press <Enter> when ready for taking measurements on the NEW version."
    );
    await waitForInput();
  }

  const newValues = await performMeasurementSet(newTimings, "new", newUrl);

  console.log();

  analyseResults(oldValues, newValues, options.metric);

  process.exit(0);
})();
