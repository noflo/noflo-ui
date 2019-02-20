const testsContext = require.context(__dirname, true, /\.js$/);
testsContext.keys().forEach(testsContext);
