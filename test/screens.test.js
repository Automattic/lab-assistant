const test = require("node:test");
const assert = require("node:assert/strict");

const {
  screenProfiles,
  parseScreen,
  getMobileUserAgent,
} = require("../screens.js");

test("parseScreen returns screen profiles by name", () => {
  assert.equal(parseScreen("mobile"), screenProfiles.mobile);
  assert.equal(parseScreen("laptop-hidpi"), screenProfiles["laptop-hidpi"]);
});

test("parseScreen accepts custom WIDTHxHEIGHT sizes", () => {
  assert.deepEqual(parseScreen("1366x768"), {
    width: 1366,
    height: 768,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  });
});

test("parseScreen rejects invalid values", () => {
  for (const value of ["", "phone", "1366", "1366x", "0x768", "1366x0", "1366 x 768", "-1x768", "toString"]) {
    assert.equal(parseScreen(value), null, value);
  }
});

test("getMobileUserAgent matches the browser's Chrome version", () => {
  const { userAgent, userAgentMetadata } = getMobileUserAgent("Chrome/153.0.8010.36");
  assert.equal(
    userAgent,
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36"
  );
  assert.equal(userAgentMetadata.fullVersion, "153.0.8010.36");
  assert.equal(userAgentMetadata.brands[0].version, "153");
  assert.equal(userAgentMetadata.platform, "Android");
  assert.equal(userAgentMetadata.mobile, true);
});
