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
 * Calculates the standard deviation for an array of values.
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
    values.length;

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
 * Analyses the results between new version and old version, and prints
 * an analysis to the console.
 *
 * Old and new values are compared with a Welch's t-test that focuses on the
 * upper or lower part of the distribution curve, depending on which mean is
 * larger. Results are assumed significant if the resulting p-value is less than
 * or equal to BASE_SIGNIFICANCE.
 *
 * @param {Array<Number>} oldSet The set of values for the old version.
 * @param {Array<Number>} newSet The set of values for the new version.
 */
function analyseResults(oldSet, newSet) {
  const oldMean = calculateMean(oldSet);
  const newMean = calculateMean(newSet);

  let testResults, direction, pValue;
  if (oldMean < newMean) {
    testResults = ttest(oldSet, newSet, { alternative: "less" });
    pValue = testResults.pValue();
    direction = -1;
  } else if (oldMean > newMean) {
    testResults = ttest(oldSet, newSet, { alternative: "greater" });
    pValue = testResults.pValue();
    direction = 1;
  } else {
    direction = 0;
    pValue = 0;
  }

  const directionText = direction === 1 ? "FASTER" : "SLOWER";

  if (Number.isNaN(pValue)) {
    console.error("Error: p-value is NaN.");
    process.exit(-1);
  }

  if (direction !== 0) {
    verbose(
      `Active hypothesis: new version is ${directionText} than old version.`
    );
    verbose(
      `Statistical significance: ${ratePValue(pValue)} (p-value = ${pValue}).\n`
    );
  }

  if (direction === 0) {
    console.log(
      "There appears to be no significant difference between both versions."
    );
  } else if (pValue > BASE_SIGNIFICANCE) {
    console.log(
      "There appears to be no significant difference between both versions."
    );
    console.log(
      "If you are seeing a high degree of variability in your results, consider"
    );
    console.log("taking more samples or increasing system stability.");
  } else {
    console.log(
      `The new version appears to be ${directionText} than the old version.`
    );
    if (direction === 1) {
      console.log(
        `The new version appears to be ${round(
          (1 - newMean / oldMean) * 100
        )}% faster ` +
          `(takes ${round(
            (newMean / oldMean) * 100
          )}% of the time of the old version).`
      );
    } else {
      console.log(
        `The new version appears to be ${round(
          (newMean / oldMean - 1) * 100
        )}% slower ` +
          `(takes ${round(
            (newMean / oldMean) * 100
          )}% of the time of the old version).`
      );
    }
  }
}

module.exports = {
  analyseResults,
  calculateMean,
  calculateStandardDeviation,
  round,
};
