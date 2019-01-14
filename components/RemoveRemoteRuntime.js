const noflo = require('noflo');
const registry = require('flowhub-registry');

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
    if (!__guard__(c.params != null ? c.params.user : undefined, x => x['flowhub-token'])) {
      // User not logged in, persist runtime only locally
      out.send(data);
      callback();
      return;
    }

    const rt = new registry.Runtime(data,
      {host: '$NOFLO_REGISTRY_SERVICE'});
    return rt.del(c.params.user['flowhub-token'], function(err) {
      if (err) { return callback(err); }
      out.send(data);
      return callback();
    });
  });
};


function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}