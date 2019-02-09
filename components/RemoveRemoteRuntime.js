const noflo = require('noflo');
const registry = require('flowhub-registry');

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
    if (!c.params || !c.params.user || !c.params.user['flowhub-token']) {
      // User not logged in, persist runtime only locally
      out.send(data);
      callback();
      return;
    }

    const rt = new registry.Runtime(data,
      { host: '$NOFLO_REGISTRY_SERVICE' });
    rt.del(c.params.user['flowhub-token'], (err) => {
      if (err) { return callback(err); }
      out.send(data);
      return callback();
    });
  });
};
