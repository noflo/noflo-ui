const noflo = require('noflo');

const buildContext = function() {
  let ctx;
  return ctx = {
    state: '',
    project: null,
    runtime: null,
    component: null,
    graphs: [],
    remote: []
  };
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.icon = 'exclamation-triangle';
  c.inPorts.add('error',
    {datatype: 'object'});
  c.outPorts.add('out',
    {datatype: 'object'});

  return noflo.helpers.WirePattern(c, {
    in: 'error',
    out: 'out',
    async: true
  }
  , function(err, groups, out, callback) {
    const ctx = buildContext();
    ctx.state = 'error';
    ctx.error = err.payload || err;
    out.send(ctx);
    return callback();
  });
};
