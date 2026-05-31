const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const cliPath = path.join(__dirname, "..", "lab-assistant.js");

test("prints CLI help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /lab-assistant\.js <url> \[url2\]/);
  assert.match(result.stdout, /--lighthouse/);
  assert.match(result.stdout, /--metric/);
});

test("rejects repeat values that cannot produce a t-test", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "--repeat",
      "1",
      "https://example.com",
      "https://example.com",
    ],
    {
      encoding: "utf8",
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /repeat must be an integer of at least 2/);
});
