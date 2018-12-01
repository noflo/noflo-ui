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
  });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return noflo.helpers.WirePattern(c, {
    in: 'in',
    params: 'user',
    out: 'out',
    async: true,
  },
  (data, groups, out, callback) => {
    if (['opener', 'microflo'].includes(data.protocol)) {
      // These are transient runtimes, no need to persist on Registry
      out.send(data);
      callback();
      return;
    }
    if (isDefaultRuntime(data)) {
      // No need to persist the default NoFlo runtime in registry.
      out.send(data);
      callback();
      return;
    }

    if (!c.params || !c.params.user || !c.params.user['flowhub-token']) {
      // User not logged in, persist runtime only locally
      out.send(data);
      callback();
      return;
    }

    const d = data;
    d.user = c.params.user['flowhub-user'] != null ? c.params.user['flowhub-user'].id : undefined;
    if (!data.secret) { d.secret = null; }
    const rt = new registry.Runtime(data,
      { host: '$NOFLO_REGISTRY_SERVICE' });
    rt.register(c.params.user['flowhub-token'], (err) => {
      if (err) {
        callback(err);
        return;
      }
      out.send(data);
      callback();
    });
  });
};
