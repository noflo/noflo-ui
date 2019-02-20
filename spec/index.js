const testsContext = require.context(__dirname, true, /(component|e2e)\/(.*)\.js$/);
testsContext.keys().forEach(testsContext);
