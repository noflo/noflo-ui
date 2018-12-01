const noflo = require('noflo');
const registry = require('flowhub-registry');
const { isDefaultRuntime } = require('../src/runtime');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('in',
    {datatype: 'object'});
  c.inPorts.add('user', {
    datatype: 'object',
    required: true
  }
  );
  c.outPorts.add('out',
    {datatype: 'object'});
  c.outPorts.add('error',
    {datatype: 'object'});

  return noflo.helpers.WirePattern(c, {
    in: 'in',
    params: 'user',
    out: 'out',
    async: true
  }
  , function(data, groups, out, callback) {
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

    if (!__guard__(c.params != null ? c.params.user : undefined, x => x['flowhub-token'])) {
      // User not logged in, persist runtime only locally
      out.send(data);
      callback();
      return;
    }

    data.user = c.params.user['flowhub-user'] != null ? c.params.user['flowhub-user'].id : undefined;
    if (!data.secret) { data.secret = null; }
    const rt = new registry.Runtime(data,
      {host: '$NOFLO_REGISTRY_SERVICE'});
    return rt.register(c.params.user['flowhub-token'], function(err) {
      if (err) { return callback(err); }
      out.send(data);
      return callback();
    });
  });
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}