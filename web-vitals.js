// Based on code from https://addyosmani.com/blog/puppeteer-recipes/

function calculateLCP() {
  // Left undefined until an LCP entry is observed, so that a missing LCP isn't
  // mistaken for a measurement of 0.
  window.largestContentfulPaint = undefined;

  const observer = new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const lastEntry = entries[entries.length - 1];
    window.largestContentfulPaint = lastEntry.renderTime || lastEntry.loadTime;
  });

  observer.observe({ type: "largest-contentful-paint", buffered: true });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      observer.takeRecords();
      observer.disconnect();
    }
  });
}

function calculateCLS() {
  window.cumulativeLayoutShiftScore = 0;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        console.log("New observer entry for cls: " + entry.value);
        window.cumulativeLayoutShiftScore += entry.value;
      }
    }
  });

  observer.observe({ type: "layout-shift", buffered: true });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      observer.takeRecords();
      observer.disconnect();
    }
  });
}

module.exports = {
  calculateLCP,
  calculateCLS,
};
