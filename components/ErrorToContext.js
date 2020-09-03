const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.icon = 'exclamation-triangle';
  c.inPorts.add('error',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });

  return noflo.helpers.WirePattern(c, {
    in: 'error',
    out: 'out',
    async: true,
  },
  (err, groups, out, callback) => {
    out.send({
      state: 'error',
      error: err.payload || err,
    });
    callback();
  });
};
