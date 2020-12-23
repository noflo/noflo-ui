const noflo = require('noflo');
const registry = require('flowhub-registry');
const { isDefaultRuntime } = require('../src/runtime');

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
    if (['opener', 'microflo'].includes(data.protocol)) {
      // These are transient runtimes, no need to persist on Registry
      output.sendDone({
        out: data,
      });
      return;
    }
    if (isDefaultRuntime(data)) {
      // No need to persist the default NoFlo runtime in registry.
      output.sendDone({
        out: data,
      });
      return;
    }

    if (!user || !user['flowhub-token'] || !user['flowhub-user'] || !user['flowhub-user'].id) {
      // User not logged in, persist runtime only locally
      output.sendDone({
        out: data,
      });
      return;
    }

    const d = data;
    d.user = user['flowhub-user'].id;
    if (!data.secret) {
      d.secret = null;
    }
    const rt = new registry.Runtime(data, {
      host: process.env.NOFLO_REGISTRY_SERVICE,
    });
    rt.register(user['flowhub-token'], (err) => {
      if (err) {
        output.done(err);
        return;
      }
      output.sendDone({
        out: data,
      });
    });
  });
};
