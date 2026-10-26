const ttest = require("ttest");

const { verbose } = require("./output.js");

// Maximum p-value considered "significant".
const BASE_SIGNIFICANCE = 0.05;

/**
 * Qualitatively rates a p-value in English.
 *
 * @param {Number} pValue The p-value to rate.
 *
 * @returns {string} An English-language string qualifying the p-value.
 */
function ratePValue(pValue) {
  if (pValue > BASE_SIGNIFICANCE) {
    return "Not significant";
  }

  return pValue > 0.01 ? "Significant" : "Very significant";
}

/**
 * Calculates the mean for an array of values.
 *
 * @param {Array<Number>} values The array of values to consider.
 *
 * @returns { Number } The mean for the input values.
 */
function calculateMean(values) {
  return values.reduce((sum, value) => (sum += value)) / values.length;
}

/**
 * Calculates the sample standard deviation (with Bessel's correction) for an
 * array of values.
 *
 * @param {Array<Number>} values The array of values to consider.
 * @param {Number} mean The mean for the array of values. Optional.
 *
 * @returns { Number } The standard deviation for the input values.
 */
function calculateStandardDeviation(values, mean = null) {
  mean = mean !== null ? mean : calculateMean(values);
  const variance =
    values.reduce((sum, value) => (sum += Math.pow(value - mean, 2)), 0) /
    (values.length - 1);

  return Math.sqrt(variance);
}

/**
 * Rounds a number to a specified level of precision (decimal places).
 *
 * @param {Number} value
 * @param {Number} precision
 *
 * @returns {Number} The rounded number.
 */
function round(value, precision = 2) {
  const power = Math.pow(10, precision);
  return Math.round(value * power) / power;
}

/**
 * Compares the old and new sets of values.
 *
 * Uses a two-sided Welch's t-test. The direction is only read from the means
 * after testing.
 *
 * @param {Array<Number>} oldSet The set of values for the old version.
 * @param {Array<Number>} newSet The set of values for the new version.
 *
 * @returns {{ direction: Number, pValue: Number, oldMean: Number, newMean: Number }}
 * The direction of the change (1 if new is lower/faster, -1 if new is
 * higher/slower, 0 if the means are equal), and the p-value for the
 * difference.
 */
function compareSets(oldSet, newSet) {
  const oldMean = calculateMean(oldSet);
  const newMean = calculateMean(newSet);

  if (oldMean === newMean) {
    return { direction: 0, pValue: 1, oldMean, newMean };
  }

  const direction = oldMean > newMean ? 1 : -1;

  // The t-test is undefined when neither set has any variance, but different
  // constant values are a perfectly consistent difference.
  const isConstant = (values) => values.every((value) => value === values[0]);
  if (isConstant(oldSet) && isConstant(newSet)) {
    return { direction, pValue: 0, oldMean, newMean };
  }

  const pValue = ttest(oldSet, newSet, { alternative: "not equal" }).pValue();

  return { direction, pValue, oldMean, newMean };
}

// Metrics that are described in terms of how much of something there is, and
// whose changes are described as an absolute difference rather than a speedup.
// CLS is a unitless score with absolute thresholds, and TBT is a total of
// blocking time (often 0) rather than the time taken to reach a point.
const ABSOLUTE_METRICS = {
  cls: { description: "layout shift", precision: 4, unit: "" },
  tbt: { description: "blocking time", precision: 2, unit: "ms" },
};

/**
 * Describes how the new version compares to the old one, for a given metric.
 *
 * @param {Number} direction The direction of the change, as returned by
 * `compareSets`. Must not be 0.
 * @param {String} metric The metric being measured.
 *
 * @returns {String} An English-language comparison to follow "appears to",
 * e.g. "be FASTER than".
 */
function describeDirection(direction, metric) {
  const absolute = ABSOLUTE_METRICS[metric];
  if (absolute) {
    return `have ${direction === 1 ? "LESS" : "MORE"} ${absolute.description} than`;
  }

  return `be ${direction === 1 ? "FASTER" : "SLOWER"} than`;
}

/**
 * Describes the size of the change between the old and new means.
 *
 * Metrics in ABSOLUTE_METRICS are described as an absolute difference. Other
 * timings are described as a speedup or slowdown factor.
 *
 * @param {Number} oldMean The mean for the old version.
 * @param {Number} newMean The mean for the new version.
 * @param {String} metric The metric being measured.
 *
 * @returns {String|null} An English-language description of the change, or
 * null if the change can't be meaningfully described.
 */
function describeChange(oldMean, newMean, metric) {
  const absolute = ABSOLUTE_METRICS[metric];
  if (absolute) {
    const format = (value) => `${round(value, absolute.precision)}${absolute.unit}`;
    const change = newMean < oldMean ? "lower" : "higher";
    return (
      `Mean ${metric.toUpperCase()} went from ${format(oldMean)} to ` +
      `${format(newMean)} (${format(Math.abs(newMean - oldMean))} ${change}).`
    );
  }

  // A relative change against zero isn't meaningful.
  if (oldMean === 0 || newMean === 0) {
    return null;
  }

  const timeShare = `takes ${round(
    (newMean / oldMean) * 100
  )}% of the time of the old version`;

  if (newMean < oldMean) {
    return `Speedup: ${round(oldMean / newMean)}× (the new version ${timeShare}).`;
  }

  return `Slowdown: ${round(newMean / oldMean)}× (the new version ${timeShare}).`;
}

/**
 * Analyses the results between new version and old version, and prints
 * an analysis to the console.
 *
 * Old and new values are compared with a two-sided Welch's t-test. Results are
 * assumed significant if the resulting p-value is less than or equal to
 * BASE_SIGNIFICANCE.
 *
 * @param {Array<Number>} oldSet The set of values for the old version.
 * @param {Array<Number>} newSet The set of values for the new version.
 * @param {String} metric The metric being measured.
 */
function analyseResults(oldSet, newSet, metric) {
  const { direction, pValue, oldMean, newMean } = compareSets(oldSet, newSet);

  if (Number.isNaN(pValue)) {
    console.error("Error: p-value is NaN.");
    process.exit(-1);
  }

  if (direction !== 0) {
    verbose(
      `Observed direction: new version appears to ${describeDirection(
        direction,
        metric
      )} old version.`
    );
    verbose(
      `Statistical significance: ${ratePValue(pValue)} (p-value = ${pValue}).\n`
    );
  }

  if (direction === 0) {
    console.log(
      "No statistically significant difference was detected between both versions."
    );
  } else if (pValue > BASE_SIGNIFICANCE) {
    console.log(
      "No statistically significant difference was detected between both versions."
    );
    console.log(
      "If you are seeing a high degree of variability in your results, consider"
    );
    console.log("taking more samples or increasing system stability.");
  } else {
    console.log(
      `The new version appears to ${describeDirection(
        direction,
        metric
      )} the old version.`
    );

    const change = describeChange(oldMean, newMean, metric);
    if (change) {
      console.log(change);
    }
  }
}

module.exports = {
  analyseResults,
  compareSets,
  describeChange,
  describeDirection,
  calculateMean,
  calculateStandardDeviation,
  round,
};
