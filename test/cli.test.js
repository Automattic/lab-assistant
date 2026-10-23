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
  assert.match(result.stdout, /--network/);
  assert.match(result.stdout, /--wait/);
  assert.match(result.stdout, /--wait_extra/);
  assert.match(result.stdout, /\[default: "none"\]/);
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

test("rejects unknown network profiles", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "--network", "5g", "https://example.com", "https://example.com"],
    {
      encoding: "utf8",
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Argument: network, Given: "5g"/);
});

test("rejects network throttling in Lighthouse mode", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "--lighthouse",
      "--network",
      "legacy",
      "https://example.com",
      "https://example.com",
    ],
    {
      encoding: "utf8",
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Network throttling is only available when measuring directly/);
});

test("rejects network throttling for the ttfb metric", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "--metric",
      "ttfb",
      "--network",
      "slow-3g",
      "https://example.com",
      "https://example.com",
    ],
    {
      encoding: "utf8",
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /`ttfb` metric can't be combined with network throttling/);
});

test("accepts no network throttling for ttfb and in Lighthouse mode", () => {
  // An invalid repeat value stops the run once options are validated, so that
  // no browser is launched.
  for (const extraArgs of [["--metric", "ttfb"], ["--lighthouse"]]) {
    const result = spawnSync(
      process.execPath,
      [
        cliPath,
        ...extraArgs,
        "--network",
        "none",
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
  }
});

test("rejects waiting options in Lighthouse mode", () => {
  for (const waitArgs of [["--wait", "network-idle"], ["--wait_extra", "2"]]) {
    const result = spawnSync(
      process.execPath,
      [
        cliPath,
        "--lighthouse",
        ...waitArgs,
        "https://example.com",
        "https://example.com",
      ],
      {
        encoding: "utf8",
      }
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Waiting options are only available when measuring directly/);
  }
});

test("rejects negative or non-numeric extra waiting times", () => {
  for (const value of ["-1", "abc"]) {
    const result = spawnSync(
      process.execPath,
      [
        cliPath,
        "--wait_extra",
        value,
        "https://example.com",
        "https://example.com",
      ],
      {
        encoding: "utf8",
      }
    );

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /wait_extra must be a non-negative number of seconds/);
  }
});
