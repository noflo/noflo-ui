const noflo = require('noflo');
const debug = require('debug')('noflo-ui:state');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.icon = 'database';
  c.inPorts.add('in',
    {datatype: 'object'});
  c.outPorts.add('state',
    {datatype: 'object'});
  c.outPorts.add('updated',
    {datatype: 'object'});
  c.state = {};
  c.tearDown = function(callback) {
    c.state = {};
    return callback();
  };
  return noflo.helpers.WirePattern(c, {
    in: 'in',
    out: ['state', 'updated'],
    async: true,
    forwardGroups: false
  }
  , function(data, groups, out, callback) {
    for (let key in data) {
      const val = data[key];
      if (c.state[key] === val) { continue; }
      debug(`${key} changed`, c.state[key], val);
      c.state[key] = val;
    }
    out.state.send(c.state);
    out.updated.send(data);
    return callback();
  });
};
