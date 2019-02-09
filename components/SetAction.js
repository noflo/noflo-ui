const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('action', {
    datatype: 'string',
    required: true,
    control: true,
  });
  c.inPorts.add('in',
    { datatype: 'all' });
  c.outPorts.add('out', {
    datatype: 'all',
    scoped: false,
  });

  return noflo.helpers.WirePattern(c, {
    params: ['action'],
    forwardGroups: false,
    async: true,
  },
  (data, groups, out, callback) => {
    out.send({
      action: c.params.action,
      payload: data,
    });
    return callback();
  });
};
