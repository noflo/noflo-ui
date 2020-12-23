const noflo = require('noflo');
const octo = require('octo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.description = 'Create a GitHub tree';
  c.inPorts.add('tree', {
    datatype: 'array',
    description: 'Tree entries to create',
  });
  c.inPorts.add('repository', {
    datatype: 'string',
    description: 'Repository path',
  });
  c.inPorts.add('base', {
    datatype: 'string',
    description: 'Base tree to create the tree for',
    control: true,
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
    if (!input.hasData('tree', 'repository', 'base', 'token')) {
      return;
    }
    const [tree, repository, base, token] = input.getData('tree', 'repository', 'base', 'token');
    const api = octo.api();
    if (token) {
      api.token(token);
    }

    const req = api.post(`/repos/${repository}/git/trees`, {
      tree,
      base_tree: base,
    });
    req.on('success', (res) => {
      output.sendDone({
        out: res.body,
      });
    });
    req.on('error', (err) => output.done(err.error || err.body));
    req();
  });
};
