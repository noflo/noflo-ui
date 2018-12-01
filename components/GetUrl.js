const noflo = require('noflo');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('in',
    {datatype: 'bang'});
  c.outPorts.add('out',
    {datatype: 'string'});

  return noflo.helpers.WirePattern(c, {
    async: true,
    forwardGroups: false
  }
  , function(data, groups, out, callback) {
    out.send(window.location.href);
    return callback();
  });
};
