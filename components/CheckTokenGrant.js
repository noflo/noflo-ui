const urlParser = require('url');
const qs = require('querystring');
const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'all' });
  c.outPorts.add('pass',
    { datatype: 'all' });
  c.outPorts.add('code',
    { datatype: 'string' });
  c.outPorts.add('error',
    { datatype: 'string' });

  return c.process((input, output) => {
    const data = input.getData('in');
    // Check the URL for a OAuth grant code
    if (typeof data.payload !== 'string') {
      output.done(new Error('URL must be a string'));
      return;
    }
    const url = urlParser.parse(data.payload);
    if (!url.query) {
      // No query params, pass out as-is
      output.sendDone({
        pass: data,
      });
      return;
    }
    const queryParams = qs.parse(url.query);
    if (queryParams.error && queryParams.error_description) {
      output.done(new Error(queryParams.error_description));
      return;
    }
    if (!queryParams.code) {
      // We don't care about other query parameters
      output.sendDone({
        pass: data,
      });
    }
    // Send code for verification
    output.sendDone({
      code: queryParams.code,
    });
  });
};
