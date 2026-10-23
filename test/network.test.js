const test = require("node:test");
const assert = require("node:assert/strict");

const { networkProfiles } = require("../network.js");

test("the none profile disables throttling", () => {
  assert.equal(networkProfiles.none, null);
});

test("the legacy profile keeps the original throttling values", () => {
  assert.deepEqual(networkProfiles.legacy, {
    download: (1.6 * 1024 * 1024) / 8,
    upload: (768 * 1024) / 8,
    latency: 150,
  });
});

test("throttling profiles define download, upload and latency", () => {
  for (const [name, conditions] of Object.entries(networkProfiles)) {
    if (conditions === null) {
      continue;
    }

    for (const key of ["download", "upload", "latency"]) {
      assert.ok(conditions[key] > 0, `${name} is missing a positive ${key}`);
    }
  }
});
