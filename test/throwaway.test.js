const test = require("node:test");
const assert = require("node:assert/strict");
const { execFile } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const { promisify } = require("node:util");

const cliPath = path.join(__dirname, "..", "lab-assistant.js");

// A page that makes a request a while after its load event.
const pageHtml = `<!DOCTYPE html>
<title>Late request fixture</title>
<p>Late request fixture</p>
<script>
  addEventListener("load", () => setTimeout(() => fetch("/late"), 300));
</script>
`;

/**
 * Runs lab-assistant against the fixture page, and counts the page loads and
 * the late requests that reach the server.
 *
 * @param {Array<String>} args The options to run lab-assistant with.
 *
 * @returns {Promise<{ loads: Number, lateRequests: Number }>} The counts.
 */
async function countRequests(args) {
  const counts = { loads: 0, lateRequests: 0 };

  const server = http.createServer((req, res) => {
    switch (req.url) {
      case "/":
        counts.loads++;
        res.setHeader("Content-Type", "text/html");
        res.end(pageHtml);
        break;
      case "/late":
        counts.lateRequests++;
        res.end("late");
        break;
      default:
        res.statusCode = 404;
        res.end();
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://localhost:${server.address().port}/`;

  try {
    await promisify(execFile)(process.execPath, [cliPath, ...args, url, url]);
  } finally {
    server.closeAllConnections();
    server.close();
  }

  return counts;
}

test("throwaway visits wait for the `--wait` point", async () => {
  const { loads, lateRequests } = await countRequests([
    "--wait",
    "network-idle",
    "--throwaway",
    "2",
    "--repeat",
    "2",
  ]);

  assert.equal(loads, 8);
  assert.equal(lateRequests, 8, "every visit lasts until its late request");
});

test("throwaway visits wait for `--wait_extra`", async () => {
  const { loads, lateRequests } = await countRequests([
    "--wait_extra",
    "1",
    "--throwaway",
    "2",
    "--repeat",
    "2",
  ]);

  assert.equal(loads, 8);
  assert.equal(lateRequests, 8, "every visit lasts until its late request");
});
