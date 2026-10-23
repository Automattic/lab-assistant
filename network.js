const { PredefinedNetworkConditions } = require("puppeteer");

// Network conditions for each throttling profile, as accepted by
// `page.emulateNetworkConditions` (throughput in bytes/s, latency in ms).
// `null` disables throttling.
const networkProfiles = {
  none: null,
  "fast-4g": PredefinedNetworkConditions["Fast 4G"],
  "slow-4g": PredefinedNetworkConditions["Slow 4G"],
  "slow-3g": PredefinedNetworkConditions["Slow 3G"],
  // The throttling lab-assistant applied by default in 0.2.0 and earlier.
  legacy: {
    download: (1.6 * 1024 * 1024) / 8,
    upload: (768 * 1024) / 8,
    latency: 150,
  },
};

module.exports = {
  networkProfiles,
};
