const test = require("node:test");
const assert = require("node:assert/strict");

const {
  compareSets,
  describeChange,
  describeDirection,
  calculateMean,
  calculateStandardDeviation,
  round,
} = require("../math.js");

test("calculateMean returns the arithmetic mean", () => {
  assert.equal(calculateMean([10, 20, 30, 40]), 25);
});

test("calculateStandardDeviation returns the sample standard deviation", () => {
  // Sum of squared deviations is 10, divided by n - 1 = 4.
  assert.equal(calculateStandardDeviation([1, 2, 3, 4, 5]), Math.sqrt(2.5));
});

test("round uses two decimal places by default", () => {
  assert.equal(round(12.345), 12.35);
});

test("round accepts explicit precision", () => {
  assert.equal(round(0.123456, 4), 0.1235);
});

test("compareSets uses a two-sided test", () => {
  // t = -2, df = 8: two-sided p ≈ 0.0805 (one-sided would be ≈ 0.0403).
  const { direction, pValue } = compareSets([1, 2, 3, 4, 5], [3, 4, 5, 6, 7]);
  assert.equal(direction, -1);
  assert.ok(Math.abs(pValue - 0.0805) < 0.0005, `unexpected p-value ${pValue}`);
});

test("compareSets is symmetric in direction but not in p-value", () => {
  const slower = compareSets([1, 2, 3, 4, 5], [3, 4, 5, 6, 7]);
  const faster = compareSets([3, 4, 5, 6, 7], [1, 2, 3, 4, 5]);
  assert.equal(faster.direction, 1);
  assert.equal(faster.pValue, slower.pValue);
});

test("compareSets reports equal means as no difference", () => {
  assert.deepEqual(compareSets([1, 3], [2, 2]), {
    direction: 0,
    pValue: 1,
    oldMean: 2,
    newMean: 2,
  });
});

test("compareSets handles sets with no variance", () => {
  const { direction, pValue } = compareSets([0.1, 0.1, 0.1], [0, 0, 0]);
  assert.equal(direction, 1);
  assert.equal(pValue, 0);
});

test("describeDirection uses speed wording for timings", () => {
  assert.equal(describeDirection(1, "load"), "be FASTER than");
  assert.equal(describeDirection(-1, "load"), "be SLOWER than");
});

test("describeDirection uses layout shift wording for CLS", () => {
  assert.equal(describeDirection(1, "cls"), "have LESS layout shift than");
  assert.equal(describeDirection(-1, "cls"), "have MORE layout shift than");
});

test("describeChange reports a speedup factor", () => {
  assert.equal(
    describeChange(200, 100, "load"),
    "Speedup: 2× (the new version takes 50% of the time of the old version)."
  );
});

test("describeChange reports a slowdown factor", () => {
  assert.equal(
    describeChange(100, 125, "load"),
    "Slowdown: 1.25× (the new version takes 125% of the time of the old version)."
  );
});

test("describeChange skips ratios against zero", () => {
  assert.equal(describeChange(0, 50, "load"), null);
});

test("describeChange reports an absolute difference for CLS", () => {
  assert.equal(
    describeChange(0.12, 0, "cls"),
    "Mean CLS went from 0.12 to 0 (0.12 lower)."
  );
});

test("describeDirection uses blocking time wording for TBT", () => {
  assert.equal(describeDirection(1, "tbt"), "have LESS blocking time than");
  assert.equal(describeDirection(-1, "tbt"), "have MORE blocking time than");
});

test("describeChange reports an absolute difference for TBT", () => {
  assert.equal(
    describeChange(0, 150.5, "tbt"),
    "Mean TBT went from 0ms to 150.5ms (150.5ms higher)."
  );
});
