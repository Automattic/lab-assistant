#!/usr/bin/env node
/**
 *  Main file for lab-assistant.
 */

const puppeteer = require( 'puppeteer' );
const yargs = require( 'yargs' );
const ttest = require( 'ttest' );
const readline = require( 'readline' );
const Progress = require( 'cli-progress' );

let options;

const rl = readline.createInterface( {
  input: process.stdin,
  output: process.stdout
} );

function verbose( ...args ) {
	if ( ! options || options.verbose ) {
		console.log( ...args );
	}
}

// Maximum p-value considered "significant".
const BASE_SIGNIFICANCE = 0.05;

/**
 * Returns a promise that only resolves once the user presses <Enter>.
 *
 * @returns {Promise} The user input promise.
 */
function waitForInput() {
  return new Promise( (resolve, reject) => rl.question( '', () => resolve() ) );
}

/**
 * Qualitatively rates a p-value in English.
 *
 * @param {Number} pValue The p-value to rate.
 *
 * @returns {string} An English-language string qualifying the p-value.
 */
function ratePValue( pValue ) {
  if ( pValue > BASE_SIGNIFICANCE ) {
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
function calculateMean( values ) {
  return values.reduce( ( sum, value ) => sum += value ) / values.length;
}

/**
 * Calculates the mean for an array of values.
 *
 * @param {Array<Number>} values The array of values to consider.
 * @param {Number} mean The mean for the array of values. Optional.
 *
 * @returns { Number } The standard deviation for the input values.
 */
function calculateStandardDeviation( values, mean = null ) {
  mean = mean !== null ? mean : calculateMean( values );
  const variance = values.reduce( ( sum, value ) =>
    sum += Math.pow( ( value - mean ), 2 ), 0 ) / values.length;

  return Math.sqrt( variance );
}

/**
 * Rounds a number to a specified level of precision (decimal places).
 *
 * @param {Number} value
 * @param {Number} precision
 *
 * @returns {Number} The rounded number.
 */
function round( value, precision = 2 ) {
  const power = Math.pow( 10, precision );
  return Math.round( value * power ) / power;
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
function analyseResults( oldSet, newSet ) {
  const oldMean = calculateMean( oldSet );
  const newMean = calculateMean( newSet );

  let testResults, direction;
  if ( oldMean < newMean ) {
    testResults = ttest( oldSet, newSet, { alternative: 'less' } );
    direction = -1;
  } else {
    testResults = ttest( oldSet, newSet, { alternative: 'greater' } );
    direction = 1;
  }

  const directionText = direction === 1 ? 'FASTER' : 'SLOWER';

  const pValue = testResults.pValue();
  verbose( `Active hypothesis: new version is ${ directionText } than old version.` );
  verbose( `Statistical significance: ${ ratePValue( pValue ) } (p-value = ${ pValue }).\n` );

  if ( pValue > BASE_SIGNIFICANCE ) {
    console.log( 'There appears to be no significant difference between both versions.' );
    console.log( 'If you are seeing a high degree of variability in your results, consider' );
    console.log( 'taking more samples or increasing system stability.' );
  } else {
    console.log( `The new version appears to be ${ directionText } than the old version.` );
    if ( direction === 1 ) {
      console.log( `The new version appears to be ${ round( ( 1 - newMean / oldMean ) * 100 ) }% faster ` +
      `(takes ${ round( newMean / oldMean * 100 ) }% of the time of the old version).` );
    } else {
      console.log( `The new version appears to be ${ round( ( newMean / oldMean - 1 ) * 100 ) }% slower ` +
      `(takes ${ round( newMean / oldMean * 100 ) }% of the time of the old version).` );
    }
  }
}

/**
 * Initialises a Puppeteer Browser object and returns it.
 *
 * @returns {Browser} The initialised Browser object.
 */
async function initBrowser() {
	const browser = await puppeteer.launch( {
    headless: options.headless,
    userDataDir: '/Users/sgomes/tempprof/',
    executablePath: '/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary',
	} );

  return browser;
}

/**
 * Initialises a Puppeteer Page object and returns it, along with a Client.
 *
 * @param {Browser} browser A Puppeteer Browser object.
 *
 * @returns {{ page: Page, client: Client }} An object with the initialised Page and Client.
 */
async function initPage( browser ) {
  const page = await browser.newPage();
  const client = await page.target().createCDPSession();

	if ( options.cpu_slowdown ) {
		await client.send( 'Emulation.setCPUThrottlingRate', { rate: options.cpu_slowdown } );
	}

	page.setViewport( {
		width: 1920,
		height: 1200,
		deviceScaleFactor: 1,
		isMobile: false,
		hasTouch: false,
		isLandscape: true
  } );

  await page.setCacheEnabled( false );

  return { page, client };
}

/**
 * Handles an error obtained while attempting to fetch a page.
 *
 * @param {Error} e The Puppeteer-provided error.
 */
function handleFetchError( e ) {
  console.error( '\n' );
  console.error( 'Error fetching page.' );
  console.error( e );
  console.error( '\nExiting.' )
  process.exit( -1 );
}

/**
 * Loads a page in Puppeteer, without doing anything with it.
 * Used for throwaway requests that help improve result consistency.
 *
 * @param {String} url The URL to load.
 */
async function load( url ) {
  const browser = await initBrowser();
  const { page } = await initPage( browser );

  try {
    await page.goto( url );
  } catch( e ) {
    handleFetchError( e );
  }

  teardown( browser );
}

/**
 * Loads a page in Puppeteer and takes several measurements during load.
 *
 * @param {String} url The URL to load.
 *
 * @returns {{ navigation: Object, paint: Object }} An object with multiple
 * browser-obtained performance timings.
 */
async function loadAndMeasure( url ) {
  const browser = await initBrowser();
  const { page } = await initPage( browser );

  try {
    await page.goto( url );
  } catch( e ) {
    handleFetchError( e );
  }

  const navigation = JSON.parse( await page.evaluate( () =>
    JSON.stringify( performance.getEntriesByType( 'navigation' )[0].toJSON() ) ) );

  const paint = await page.evaluate( () => {
    const paintEntries = performance.getEntriesByType( 'paint' );
    return paintEntries.reduce( ( obj, entry ) => ( {
      ...obj,
      [ entry.name ]: entry.startTime
    } ), {} );
  } );

  teardown( browser );

  return { navigation, paint };
}

/**
 * Takes a set of browser timings as returned by `loadAndMeasure` and returns
 * the desired metric.
 *
 * @param {{ navigation: Object, paint: Object }} timings The timings object.
 * @param {String} metric The desired metric, as described in the `metric`
 * command-line option description.
 *
 * @return {Number} The desired metric value.
 */
function calculateMetric( timings, metric ) {
  switch ( metric ) {
    case 'ttfb':
      return timings.navigation.responseStart;
    case 'fp':
      return timings.paint[ 'first-paint' ];
    case 'fcp':
      return timings.paint[ 'first-contentful-paint' ];
    case 'dcl':
      return timings.navigation.domContentLoadedEventEnd;
    case 'load':
      return timings.navigation.loadEventEnd;
  }
}

/**
 * Closes a Puppeteer Browser instance.
 *
 * @param {Browser} browser The Browser instance to close.
 */
async function teardown( browser ) {
	await browser.close();
}

/**
 * Performs a set of measurements for a given version.
 *
 * @param {Array} timingSet Output parameter. An empty array into which timings
 * will be placed.
 * @param {String} versionString The version to run measurements for.
 *
 * @return {Array<Number>} The metric value for each page load within the set.
 */
async function performMeasurementSet( timingSet, versionString, url ) {
  const progress = new Progress.Bar({}, Progress.Presets.shades_classic);
  progress.start(options.repeat, 0);

  for ( let i = 0; i < options.throwaway; i++ ) {
    await load( url );
  }

  for ( let i = 0; i < options.repeat; i++ ) {
    const timings = await loadAndMeasure( url );
    timingSet.push( timings );
    progress.update( i + 1 );
  }
  progress.stop();

  const values = timingSet.map( timings => calculateMetric( timings, options.metric ) );
  const mean = calculateMean( values );

  console.log();
  console.log( `Test results for ${ versionString } version (${ url })` );
  verbose( 'Values: ', values );
  console.log( `Mean: ${ round( mean ) }ms` );
  console.log( `Standard deviation: ${ round( calculateStandardDeviation( values, mean ) ) }ms` );
  console.log( `Slowest measurement: ${ round( Math.max( ...values ) ) }ms` );
  console.log( `Fastest measurement: ${ round( Math.min( ...values ) ) }ms` );
  console.log();

  return values;
}

/**
 * Main method for the tool.
 */
( async () => {
  options = yargs
    .command('$0 <url> [url2]', '', ( yargs ) =>
      yargs.positional( 'url', {
        describe: `URL to fetch content from.
        If \`url2\` is not specified, this is used for both the new and old
        versions, with the application pausing in between to allow for the
        version swap.`,
      }).positional( 'url2', {
        describe: `Second URL to fetch content from.
        If specified, this refers to the new version, while \`url\` refers to
        the old version.`,
      })
    )
		.option( 'verbose', {
			alias: 'v',
			type: 'boolean',
      default: false,
      describe: 'Output more details.',
		} )
		.option( 'headless', {
			type: 'boolean',
			default: true,
			describe: 'Whether to use a headless browser.',
		} )
		.option( 'repeat', {
			alias: 'r',
			type: 'number',
			default: 10,
			describe: 'The number of measurements to take for each version.',
    } )
    .option( 'throwaway', {
      alias: 't',
      type: 'number',
      default: 1,
      describe: `The number of throwaway visits to perform before any actual measurements.
      Keeping it at 1 or increasing the value can help with stability.`
    } )
		.option( 'cpu_slowdown', {
			alias: 'c',
			type: 'number',
			describe: 'The CPU slowdown throttling to apply (may help achieve more stable results in CPU-heavy pages).',
    } )
    .option( 'metric', {
      alias: 'm',
      type: 'string',
      describe: `The metric to consider.
      Metrics:
      - ttfb: Time to First Byte
      - fp: First Paint
      - fcp: First Contentful Paint
      - dcl: Time to DOMContentLoad event end
      - load: Time to Load event end`,
      default: 'load',
      choices: [ 'ttfb', 'fp', 'fcp', 'dcl', 'load' ]
    } )
    .version( false ).argv;

  const oldTimings = [];
  const newTimings = [];

  const oldUrl = options.url;
  const newUrl = options.url2 || options.url;

  if ( ! options.url2  ) {
    console.log( 'Press <Enter> when ready for taking measurements on the OLD version.' );
    await waitForInput();
  }

  const oldValues = await performMeasurementSet( oldTimings, 'old', oldUrl );

  console.log();

  if ( ! options.url2  ) {
    console.log( 'Press <Enter> when ready for taking measurements on the NEW version.' );
    await waitForInput();
  }

  const newValues = await performMeasurementSet( newTimings, 'new', newUrl );

  console.log();

  analyseResults( oldValues, newValues );

  process.exit(0);
} )();
