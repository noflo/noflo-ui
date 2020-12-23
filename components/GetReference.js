const noflo = require('noflo');
const octo = require('octo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('repository',
    { datatype: 'string' });
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
  c.outPorts.add('reference',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('repository', 'token', 'reference')) {
      return;
    }
    const [repository, token, reference] = input.getData('repository', 'token', 'reference');
    const api = octo.api();
    if (token) {
      api.token(token);
    }
    const ref = reference || 'heads/master';

    const request = api.get(`/repos/${repository}/git/refs/${ref}`);
    request.on('success', (res) => {
      if (!res.body) {
        output.done(new Error('No result received'));
        return;
      }
      output.sendDone({
        reference: res.body,
      });
    });
    request.on('error', (err) => output.done(err.error || err.body));
    request();
  });
};
