const externals = require('./externals.conf.js');
const base = require('./karma.conf.js');

module.exports = function(config) {
  if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY) {
    console.log('Make sure the SAUCE_USERNAME and SAUCE_ACCESS_KEY environment variables are set.')
    process.exit(1)
  }

  // Apply base config
  base(config);

  // Then add Sauce Labs setup
  const customLaunchers = {
    sl_safari: {
      base: 'SauceLabs',
      browserName: 'safari',
      version: '11',
    },
    sl_firefox: {
      base: 'SauceLabs',
      browserName: 'firefox',
      version: '56',
    },
  };
  const reporters = config.reporters;
  reporters.push('saucelabs');

  // Apply additional config
  config.set({
    reporters,
    customLaunchers,
    browsers: config.browsers.concat(Object.keys(customLaunchers)),
    captureTimeout: 120000,
    concurrency: 3,
  });
}
