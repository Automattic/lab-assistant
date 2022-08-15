let options;

function verbose(...args) {
  if (!options || options.verbose) {
    console.log(...args);
  }
}

function setOutputOptions(opt) {
	options = opt;
}

module.exports = {
  verbose,
	setOutputOptions
};
