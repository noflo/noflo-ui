const noflo = require('noflo');

const buildContext = function () {
  let ctx;
  return ctx = { state: '' };
};

exports.getComponent = function () {
  const c = new noflo.Component();
  c.icon = 'spinner';
  c.inPorts.add('start',
    { datatype: 'bang' });
  c.outPorts.add('out',
    { datatype: 'object' });

  return noflo.helpers.WirePattern(c, {
    in: 'start',
    out: 'out',
    async: true,
  },
  (data, groups, out, callback) => {
    const ctx = buildContext();
    ctx.state = 'loading';
    out.send(ctx);
    return callback();
  });
};
