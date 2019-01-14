const noflo = require('noflo');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.description = 'Strips state from action payloads for backwards compat';
  c.inPorts.add('in',
    {datatype: 'object'});
  c.outPorts.add('out',
    {datatype: 'all'});
  return noflo.helpers.WirePattern(c, {
    async: true,
    forwardGroups: true
  }
  , function(data, groups, out, callback) {
    out.send(data.payload || data);
    return callback();
  });
};
