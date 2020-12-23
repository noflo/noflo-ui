const noflo = require('noflo');
const octo = require('octo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.description = 'Create a GitHub commit';
  c.inPorts.add('message', {
    datatype: 'string',
    description: 'Commit message',
  });
  c.inPorts.add('tree', {
    datatype: 'string',
    description: 'Tree SHA',
  });
  c.inPorts.add('parents', {
    datatype: 'array',
    description: 'Parent commits',
  });
  c.inPorts.add('repository', {
    datatype: 'string',
    description: 'Repository path',
  });
  c.inPorts.add('token', {
    datatype: 'string',
    description: 'GitHub API token',
    required: true,
    scoped: false,
    control: true,
  });
  c.outPorts.add('out',
    { datatype: 'string' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('message', 'tree', 'parents', 'repository', 'token')) {
      return;
    }
    const [
      message,
      tree,
      parents,
      repository,
      token,
    ] = input.getData('message', 'tree', 'parents', 'repository', 'token');
    const api = octo.api();
    if (token) { api.token(token); }

    const req = api.post(`/repos/${repository}/git/commits`, {
      message,
      tree,
      parents: parents || [],
    });
    req.on('success', (res) => {
      output.sendDone({
        out: res.body.sha,
      });
    });
    req.on('error', (err) => output.done(err.error || err.body));
    req();
  });
};
