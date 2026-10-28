// Screen profiles, as accepted by `page.setViewport`.
const screenProfiles = {
  // Lighthouse's desktop emulation.
  desktop: {
    width: 1350,
    height: 940,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  // DevTools "Laptop with MDPI screen".
  laptop: {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  // DevTools "Laptop with HiDPI screen".
  "laptop-hidpi": {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  },
  // Lighthouse's mobile emulation (Moto G Power).
  mobile: {
    width: 412,
    height: 823,
    deviceScaleFactor: 1.75,
    isMobile: true,
    hasTouch: true,
  },
};

/**
 * Parses a `--screen` value into a viewport.
 *
 * @param {String} value A screen profile name, or a custom `WIDTHxHEIGHT` size.
 *
 * @returns {Object|null} The viewport, as accepted by `page.setViewport`, or
 * null if the value isn't valid.
 */
function parseScreen(value) {
  if (Object.hasOwn(screenProfiles, value)) {
    return screenProfiles[value];
  }

  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match || Number(match[1]) === 0 || Number(match[2]) === 0) {
    return null;
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  };
}

/**
 * Returns the user agent that Chrome on Android sends, for a given version of
 * Chrome. Chrome reduces the user agent on Android to a fixed Android version
 * and device model, and the Chrome version to its major number.
 *
 * @param {String} browserVersion The browser version, as returned by
 * `browser.version()` (e.g. "Chrome/153.0.8010.36").
 *
 * @returns {{ userAgent: String, userAgentMetadata: Object }} The user agent and
 * its metadata (for client hints), as accepted by `page.setUserAgent`.
 */
function getMobileUserAgent(browserVersion) {
  const fullVersion = browserVersion.split("/")[1];
  const majorVersion = fullVersion.split(".")[0];

  return {
    userAgent:
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 " +
      `(KHTML, like Gecko) Chrome/${majorVersion}.0.0.0 Mobile Safari/537.36`,
    userAgentMetadata: {
      brands: [
        { brand: "Chromium", version: majorVersion },
        { brand: "Google Chrome", version: majorVersion },
      ],
      fullVersion,
      platform: "Android",
      platformVersion: "",
      architecture: "",
      model: "",
      mobile: true,
    },
  };
}

module.exports = {
  screenProfiles,
  parseScreen,
  getMobileUserAgent,
};
