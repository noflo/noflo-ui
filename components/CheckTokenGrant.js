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

  return noflo.helpers.WirePattern(c, {
    in: ['in'],
    out: ['pass', 'code'],
    forwardGroups: true,
    async: true,
  },
  (data, groups, out, callback) => {
    // Check the URL for a OAuth grant code
    if (typeof data.payload !== 'string') {
      return callback(new Error('URL must be a string'));
    }
    const url = urlParser.parse(data.payload);
    if (!url.query) {
      // No query params, pass out as-is
      out.pass.send(data);
      return callback();
    }
    const queryParams = qs.parse(url.query);
    if (queryParams.error && queryParams.error_description) {
      callback(new Error(queryParams.error_description));
    }
    if (!queryParams.code) {
      // We don't care about other query parameters
      out.pass.send(data);
      return callback();
    }
    // Send code for verification
    out.code.send(queryParams.code);
    return callback();
  });
};
