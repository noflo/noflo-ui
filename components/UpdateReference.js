const noflo = require('noflo');
const octo = require('octo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('repository',
    { datatype: 'string' });
  c.inPorts.add('commit', {
    datatype: 'string',
    description: 'Commit SHA',
  });
  c.inPorts.add('token', {
    datatype: 'string',
    required: true,
    scoped: false,
    control: true,
  });
  c.inPorts.add('reference', {
    datatype: 'string',
    default: 'heads/master',
    required: true,
    control: true,
  });
  c.inPorts.add('force', {
    datatype: 'boolean',
    default: false,
    required: true,
    control: true,
  });
  c.outPorts.add('reference',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('repository', 'commit', 'token', 'reference', 'force')) {
      return;
    }
    const [
      repository,
      commit,
      token,
      reference,
      force,
    ] = input.getData('repository', 'commit', 'token', 'reference', 'force');

    const api = octo.api();
    if (token) {
      api.token(token);
    }
    let ref = reference || 'heads/master';
    if (ref.substr(0, 5) === 'refs/') {
      ref = ref.substr(5);
    }

    const req = api.patch(`/repos/${repository}/git/refs/${ref}`, {
      sha: commit,
      force,
    });
    req.on('success', (res) => {
      output.sendDone({
        reference: res.body,
      });
    });
    req.on('error', (err) => output.done(err.error || err.body));
    req();
  });
};
