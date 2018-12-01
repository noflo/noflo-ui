const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('nodes',
    { datatype: 'array' });
  c.outPorts.add('context',
    { datatype: 'object' });

  return noflo.helpers.WirePattern(c, {
    in: 'nodes',
    out: 'context',
    async: true,
  },
  (nodes, groups, out, callback) => {
    const ctx = { searchGraphResult: nodes };
    out.send(ctx);
    callback();
  });
};
