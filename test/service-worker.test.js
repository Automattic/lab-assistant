const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const { promisify } = require("node:util");

const { networkProfiles } = require("../network.js");

const cliPath = path.join(__dirname, "..", "lab-assistant.js");
const network = "fast-4g";

// A page that registers a service worker which takes control during the first
// load. Once it has, the page times a request and reports the duration back.
const pageHtml = (load) => `<!DOCTYPE html>
<title>Service worker fixture</title>
<p>Service worker fixture</p>
<img src="/hold?load=${load}" alt="">
<script>
  navigator.serviceWorker.addEventListener("controllerchange", async () => {
    const start = performance.now();
    const response = await fetch("/probe");
    await response.text();
    const duration = performance.now() - start;
    fetch("/report?load=${load}&duration=" + duration);
  });
  navigator.serviceWorker.register("/sw.js");
</script>
`;

const serviceWorkerJs = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim())
);
self.addEventListener("fetch", (event) =>
  event.respondWith(fetch(event.request))
);
`;

/**
 * Starts a server for the fixture page.
 *
 * Each page load is kept from finishing (by an image that doesn't get a
 * response) until its report arrives, so that lab-assistant doesn't close the
 * browser first.
 *
 * @returns {Promise<{ server: http.Server, url: String, durations: Array<Number> }>}
 * The server, the URL of the fixture page, and the durations reported so far.
 */
async function startFixtureServer() {
  const durations = [];
  const held = new Map();
  let loads = 0;

  const release = (load) => {
    held.get(load)?.end();
    held.delete(load);
  };

  const server = http.createServer((req, res) => {
    const { pathname, searchParams } = new URL(req.url, "http://localhost");
    const load = searchParams.get("load");

    switch (pathname) {
      case "/":
        res.setHeader("Content-Type", "text/html");
        res.end(pageHtml(++loads));
        break;
      case "/sw.js":
        res.setHeader("Content-Type", "text/javascript");
        res.end(serviceWorkerJs);
        break;
      case "/hold":
        held.set(load, res);
        // Give up if the report never arrives, so that the test fails on its
        // assertions rather than by hanging.
        setTimeout(() => release(load), 10000).unref();
        break;
      case "/report":
        durations.push(Number(searchParams.get("duration")));
        res.end();
        release(load);
        break;
      case "/probe":
        res.end("probe");
        break;
      default:
        res.statusCode = 404;
        res.end();
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  return {
    server,
    url: `http://localhost:${server.address().port}/`,
    durations,
  };
}

test("throttles requests made after a service worker takes control", async () => {
  const { server, url, durations } = await startFixtureServer();

  try {
    await promisify(execFile)(process.execPath, [
      cliPath,
      "--network",
      network,
      "--throwaway",
      "0",
      "--repeat",
      "2",
      url,
      url,
    ]);
  } finally {
    server.closeAllConnections();
    server.close();
  }

  assert.equal(durations.length, 4, "every page load reports a duration");

  // A request answered by the service worker would skip the throttling, and
  // take a few milliseconds.
  for (const duration of durations) {
    assert.ok(
      duration >= networkProfiles[network].latency,
      `request took ${duration}ms, which is less than the network latency`
    );
  }
});
