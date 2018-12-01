const noflo = require('noflo');
const octo = require('octo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.description = 'Get user token from action';
  c.icon = 'key';
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('limit', {
    datatype: 'int',
    default: 50,
  });
  c.outPorts.add('token',
    { datatype: 'string' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return noflo.helpers.WirePattern(c, {
    in: 'in',
    params: ['limit'],
    out: ['token', 'out'],
    async: true,
  },
  (data, groups, out, callback) => {
    let token;
    if (data.state || data.state.user || data.state.user['github-token']) {
      token = data.state.user['github-token'];
    }

    // Check that user has some API calls remaining
    const api = octo.api();
    if (token) { api.token(token); }
    const request = api.get('/rate_limit');
    request.on('success', (res) => {
      const remaining = (res.body.rate != null ? res.body.rate.remaining : undefined) || 0;
      const limit = c.params.limit ? parseInt(c.params.limit, 10) : 50;
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
      callback();
    });
    request.on('error', (err) => {
      const error = err.error || err.body;
      if (!error) {
        callback(new Error('Failed to communicate with GitHub. Try again later'));
        return;
      }
      callback(new Error(`Failed to communicate with GitHub: ${error}`));
    });
    request();
  });
};
