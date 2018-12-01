const noflo = require('noflo');
const octo = require('octo');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.description = 'Get user token from action';
  c.icon = 'key';
  c.inPorts.add('in',
    {datatype: 'object'});
  c.inPorts.add('limit', {
    datatype: 'int',
    default: 50
  }
  );
  c.outPorts.add('token',
    {datatype: 'string'});
  c.outPorts.add('out',
    {datatype: 'object'});
  c.outPorts.add('error',
    {datatype: 'object'});

  return noflo.helpers.WirePattern(c, {
    in: 'in',
    params: ['limit'],
    out: ['token', 'out'],
    async: true
  }
  , function(data, groups, out, callback) {
    const token = __guard__(data.state != null ? data.state.user : undefined, x => x['github-token']) || null;

    // Check that user has some API calls remaining
    const api = octo.api();
    if (token) { api.token(token); }
    const request = api.get('/rate_limit');
    request.on('success', function(res) {
      const remaining = (res.body.rate != null ? res.body.rate.remaining : undefined) || 0;
      const limit = c.params.limit ? parseInt(c.params.limit) : 50;
      if (remaining < limit) {
        if (token) {
          callback(new Error('GitHub API access rate limited, try again later'));
          return;
        }
        callback(new Error('GitHub API access rate limited. Please log in to increase the limit'));
        return;
      }
      out.token.send(token);
      out.out.send(data.payload);
      return callback();
    });
    request.on('error', function(err) {
      const error = err.error || err.body;
      if (!error) {
        return callback(new Error('Failed to communicate with GitHub. Try again later'));
      }
      return callback(new Error(`Failed to communicate with GitHub: ${error}`));
    });
    return request();
  });
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}