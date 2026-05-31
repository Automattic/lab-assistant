const test = require("node:test");
const assert = require("node:assert/strict");

const {
  calculateMean,
  calculateStandardDeviation,
  round,
} = require("../math.js");

test("calculateMean returns the arithmetic mean", () => {
  assert.equal(calculateMean([10, 20, 30, 40]), 25);
});

test("calculateStandardDeviation returns the population standard deviation", () => {
  assert.equal(calculateStandardDeviation([2, 4, 4, 4, 5, 5, 7, 9]), 2);
});

test("round uses two decimal places by default", () => {
  assert.equal(round(12.345), 12.35);
});

test("round accepts explicit precision", () => {
  assert.equal(round(0.123456, 4), 0.1235);
});
