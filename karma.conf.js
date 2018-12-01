const externals = require('./externals.conf.js');

process.env.CHROME_BIN = require('puppeteer').executablePath();

module.exports = function (config) {
  const files = [
    'node_modules/sinon/pkg/sinon.js',
    'node_modules/react/dist/react-with-addons.min.js',
    'node_modules/react-dom/dist/react-dom.min.js',
    'node_modules/hammerjs/hammer.min.js',
    'node_modules/syn/dist/global/syn.js',
    'browser/noflo-ui.min.js',
    'spec/utils/*.js',
    'spec/*.js',
    'spec/browser/*.js',
    {
      pattern: 'spec/mockruntime.html',
      included: false,
      served: true,
      watched: true,
    },
    {
      pattern: 'index.html',
      included: false,
      served: true,
      watched: true,
    },
  ];
  const serveExternals = externals.slice(0);
  serveExternals.push('themes/*.css');
  serveExternals.push('css/*.css');
  serveExternals.forEach((pattern) => {
    if (files.indexOf(pattern) !== -1) {
      return;
    }
    files.push({
      pattern,
      included: false,
      served: true,
      watched: false,
    });
  });

  const configuration = {
    basePath: '',
    frameworks: ['mocha', 'chai'],
    files,
    exclude: [],
    preprocessors: {},
    reporters: ['mocha'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: ['ChromeHeadless'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox'],
      },
    },
    singleRun: true,
    concurrency: Infinity,
  };

  if (process.env.TRAVIS) {
    configuration.browsers = ['ChromeHeadlessNoSandbox'];
  }

  config.set(configuration);
};
