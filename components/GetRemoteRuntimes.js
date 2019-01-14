const noflo = require('noflo');
const registry = require('flowhub-registry');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('user',
    {datatype: 'object'});
  c.inPorts.add('runtimes', {
    datatype: 'array',
    required: true
  }
  );
  c.outPorts.add('runtime',
    {datatype: 'object'});
  c.outPorts.add('error',
    {datatype: 'object'});

  return noflo.helpers.WirePattern(c, {
    params: ['runtimes'],
    in: 'user',
    out: 'runtime',
    async: true
  }
  , function(data, groups, out, callback) {
    if (!data['flowhub-token']) { return callback(); }
    const knownRuntimes = c.params.runtimes || [];
    return registry.list(data['flowhub-token'],
      {host: '$NOFLO_REGISTRY_SERVICE'}
    , function(err, runtimes) {
      if (err) { return callback(err); }
      const updateRts = runtimes.filter(function(rt) {
        let known = null;
        for (let knownRuntime of Array.from(knownRuntimes)) {
          if (knownRuntime.id !== rt.runtime.id) { continue; }
          known = knownRuntime;
        }
        if (!known) { return true; }
        const knownSeen = new Date(known.seen);
        if ((rt.runtime.seen.getTime() === knownSeen.getTime()) && (rt.runtime.address === known.address) && (rt.runtime.secret === known.secret)) {
          return false;
        }
        // Copy information we only get by connecting
        rt.runtime.capabilities = known.capabilities;
        rt.runtime.components = known.components;
        return true;
      });
      if (!updateRts.length) { return callback(); }
      out.beginGroup('$NOFLO_REGISTRY_SERVICE');
      for (let rt of Array.from(updateRts)) { out.send(rt.runtime); }
      out.endGroup();
      return callback();
    });
  });
};
