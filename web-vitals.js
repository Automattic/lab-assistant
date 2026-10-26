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

// Uses session windows, as defined in https://web.dev/articles/cls: shifts less
// than 1s apart are grouped into windows of up to 5s, and the score is the
// largest window total.
function calculateCLS() {
  window.cumulativeLayoutShiftScore = 0;

  let sessionValue = 0;
  let sessionStart = 0;
  let sessionLast = 0;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) {
        continue;
      }

      if (
        sessionValue &&
        entry.startTime - sessionLast < 1000 &&
        entry.startTime - sessionStart < 5000
      ) {
        sessionValue += entry.value;
      } else {
        sessionValue = entry.value;
        sessionStart = entry.startTime;
      }
      sessionLast = entry.startTime;

      window.cumulativeLayoutShiftScore = Math.max(
        window.cumulativeLayoutShiftScore,
        sessionValue
      );
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
