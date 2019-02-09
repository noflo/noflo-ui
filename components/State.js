const noflo = require('noflo');
const debug = require('debug')('noflo-ui:state');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.icon = 'database';
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('state',
    { datatype: 'object' });
  c.outPorts.add('updated',
    { datatype: 'object' });
  c.state = {};
  c.tearDown = (callback) => {
    c.state = {};
    callback();
  };
  return noflo.helpers.WirePattern(c, {
    in: 'in',
    out: ['state', 'updated'],
    async: true,
    forwardGroups: false,
  },
  (data, groups, out, callback) => {
    Object.keys(data).forEach((key) => {
      const val = data[key];
      if (c.state[key] === val) { return; }
      debug(`${key} changed`, c.state[key], val);
      c.state[key] = val;
    });
    out.state.send(c.state);
    out.updated.send(data);
    return callback();
  });
};
