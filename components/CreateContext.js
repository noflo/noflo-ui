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
  c.icon = 'file-o';
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
    ctx.state = 'ok';
    out.send(ctx);
    return callback();
  });
};
