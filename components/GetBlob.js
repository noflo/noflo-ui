const noflo = require('noflo');
const octo = require('octo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.description = 'Get a git blob';
  c.inPorts.add('repository', {
    datatype: 'string',
    description: 'Repository path',
    required: true,
  });
  c.inPorts.add('sha', {
    datatype: 'string',
    description: 'Blob SHA',
    required: true,
  });
  c.inPorts.add('token', {
    datatype: 'string',
    description: 'GitHub API token',
    required: true,
    scoped: false,
    control: true,
  });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('repository', 'sha', 'token')) {
      return;
    }
    const [repository, sha, token] = input.getData('repository', 'sha', 'token');
    const api = octo.api();
    if (token) {
      api.token(token);
    }

    const request = api.get(`/repos/${repository}/git/blobs/${sha}`);
    request.on('success', (res) => {
      if (!res.body) {
        output.done(new Error('no result available'));
        return;
      }
      output.sendDone({
        out: res.body,
      });
    });
    request.on('error', (err) => output.done(err.error || err.body));
    request();
  });
};
