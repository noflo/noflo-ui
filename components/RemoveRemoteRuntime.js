const noflo = require('noflo');
const registry = require('flowhub-registry');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('user', {
    datatype: 'object',
    required: true,
    control: true,
  });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('in', 'user')) {
      return;
    }
    const [data, user] = input.getData('in', 'user');
    if (!user || !user['flowhub-token']) {
      // User not logged in, persist runtime only locally
      output.sendDone({
        out: data,
      });
      return;
    }

    const rt = new registry.Runtime(data, {
      host: process.env.NOFLO_REGISTRY_SERVICE,
    });
    rt.del(user['flowhub-token'], (err) => {
      if (err) {
        output.done(err);
      }
      output.sendDone({
        out: data,
      });
    });
  });
};
