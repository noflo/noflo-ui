const noflo = require('noflo');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('in',
    {datatype: 'object'});
  c.outPorts.add('out',
    {datatype: 'bang'});

  return noflo.helpers.WirePattern(c, {
    async: true,
    forwardGroups: false
  }
  , function(data, groups, out, callback) {
    window.location.hash = `#${data.payload.map(part => encodeURIComponent(part)).join('/')}`;
    out.send(true);
    return callback();
  });
};
