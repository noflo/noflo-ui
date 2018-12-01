const noflo = require('noflo');
const debug = require('debug')('noflo-ui:store');
const debugError = require('debug')('noflo-ui:store:error');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.icon = 'rocket';
  c.inPorts.add('action',
    { datatype: 'all' });
  c.inPorts.add('state',
    { datatype: 'object' });
  c.outPorts.add('pass', {
    datatype: 'object',
    scoped: false,
  });

  c.state = {};
  c.tearDown = (callback) => {
    c.state = {};
    callback();
  };
  c.forwardBrackets = {};
  return c.process((input, output) => {
    if (input.hasData('state')) {
      c.state = input.getData('state');
      output.done();
      return;
    }
    if (!input.hasStream('action')) { return; }
    const packets = input.getStream('action').filter(ip => ip.type === 'data').map(ip => ip.data);
    packets.forEach((data) => {
      if (!data.action) {
        debugError('Received action without expected payload', data);
        return;
      }
      if (data.state) {
        // Keep track of last state
        c.state = data.state;
      } else {
        debug(`${data.action} was sent without state, using previous state`);
      }
      output.send({
        pass: {
          action: data.action,
          state: c.state,
          payload: data.payload,
        },
      });
    });
    output.done();
  });
};
