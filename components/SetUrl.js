const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'string' });
  c.outPorts.add('out',
    { datatype: 'bang' });

  return noflo.helpers.WirePattern(c, {
    async: true,
    forwardGroups: false,
  },
  (data, groups, out, callback) => {
    // This will in effect cause a NoFlo network stop as the app
    // redirects to new URL
    window.location.href = data.payload;
    out.send(true);
    return callback();
  });
};
