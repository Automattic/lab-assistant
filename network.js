const { PredefinedNetworkConditions } = require("puppeteer");

const DEFAULT_NETWORK_PROFILE = "legacy";

// Network conditions for each throttling profile, as accepted by
// `page.emulateNetworkConditions` (throughput in bytes/s, latency in ms).
// `null` disables throttling.
const networkProfiles = {
  none: null,
  "fast-4g": PredefinedNetworkConditions["Fast 4G"],
  "slow-4g": PredefinedNetworkConditions["Slow 4G"],
  "slow-3g": PredefinedNetworkConditions["Slow 3G"],
  // The throttling lab-assistant always applied before profiles existed.
  legacy: {
    download: (1.6 * 1024 * 1024) / 8,
    upload: (768 * 1024) / 8,
    latency: 150,
  },
};

module.exports = {
  DEFAULT_NETWORK_PROFILE,
  networkProfiles,
};
