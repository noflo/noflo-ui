const noflo = require('noflo');
const registry = require('flowhub-registry');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('user',
    { datatype: 'object' });
  c.inPorts.add('runtimes', {
    datatype: 'array',
    required: true,
  });
  c.outPorts.add('runtime',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return noflo.helpers.WirePattern(c, {
    params: ['runtimes'],
    in: 'user',
    out: 'runtime',
    async: true,
  },
  (data, groups, out, callback) => {
    if (!data['flowhub-token']) {
      callback();
      return;
    }
    const knownRuntimes = c.params.runtimes || [];
    registry.list(data['flowhub-token'],
      { host: '$NOFLO_REGISTRY_SERVICE' },
      (err, runtimes) => {
        if (err) {
          callback(err);
          return;
        }
        const updateRts = runtimes.filter((runtime) => {
          const rt = runtime;
          const known = knownRuntimes.find(knownRuntime => knownRuntime.id === rt.runtime.id);
          if (!known) { return true; }
          const knownSeen = new Date(known.seen);
          if ((rt.runtime.seen.getTime() === knownSeen.getTime())
            && (rt.runtime.address === known.address) && (rt.runtime.secret === known.secret)) {
            return false;
          }
          // Copy information we only get by connecting
          rt.runtime.capabilities = known.capabilities;
          rt.runtime.components = known.components;
          return true;
        });
        if (!updateRts.length) {
          callback();
          return;
        }
        out.beginGroup('$NOFLO_REGISTRY_SERVICE');
        updateRts.forEach((rt) => {
          out.send(rt.runtime);
        });
        out.endGroup();
        callback();
      });
  });
};
