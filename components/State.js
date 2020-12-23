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
  return c.process((input, output) => {
    if (!input.hasData('in')) {
      return;
    }
    const data = input.getData('in');
    Object.keys(data).forEach((key) => {
      const val = data[key];
      if (c.state[key] === val) { return; }
      debug(`${key} changed`, c.state[key], val);
      c.state[key] = val;
    });
    output.sendDone({
      state: c.state,
      updated: data,
    });
  });
};
