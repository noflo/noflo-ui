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
    control: true,
  });
  c.outPorts.add('token',
    { datatype: 'string' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('in', 'limit')) {
      return;
    }
    const [data, rateLimit] = input.getData('in', 'limit');
    let token;
    if (data.state && data.state.user && data.state.user['github-token']) {
      token = data.state.user['github-token'];
    }

    // Check that user has some API calls remaining
    const api = octo.api();
    if (token) { api.token(token); }
    const request = api.get('/rate_limit');
    request.on('success', (res) => {
      const remaining = (res.body.rate != null ? res.body.rate.remaining : undefined) || 0;
      const limit = rateLimit ? parseInt(rateLimit, 10) : 50;
      if (remaining < limit) {
        if (token) {
          output.done(new Error('GitHub API access rate limited, try again later'));
          return;
        }
        output.done(new Error('GitHub API access rate limited. Please log in to increase the limit'));
        return;
      }
      output.sendDone({
        token,
        out: data.payload,
      });
    });
    request.on('error', (err) => {
      const error = err.error || err.body;
      if (!error) {
        output.done(new Error('Failed to communicate with GitHub. Try again later'));
        return;
      }
      output.done(new Error(`Failed to communicate with GitHub: ${error}`));
    });
    request();
  });
};
