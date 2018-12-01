const noflo = require('noflo');

const buildContext = () => ({
  state: '',
  project: null,
  runtime: null,
  component: null,
  graphs: [],
  remote: [],
});

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
    const ctx = buildContext();
    ctx.state = 'error';
    ctx.error = err.payload || err;
    out.send(ctx);
    callback();
  });
};
