const noflo = require('noflo');
const debug = require('debug')('noflo-ui:store');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.icon = 'rocket';
  c.inPorts.add('action',
    {datatype: 'all'});
  c.inPorts.add('state',
    {datatype: 'object'});
  c.outPorts.add('pass', {
    datatype: 'object',
    scoped: false
  }
  );

  c.state = {};
  c.tearDown = function(callback) {
    c.state = {};
    return callback();
  };
  c.forwardBrackets = {};
  return c.process(function(input, output) {
    if (input.hasData('state')) {
      c.state = input.getData('state');
      output.done();
      return;
    }
    if (!input.hasStream('action')) { return; }
    const packets = input.getStream('action').filter(ip => ip.type === 'data').map(ip => ip.data);
    for (let data of Array.from(packets)) {
      if (!data.action) {
        console.error('Received action without expected payload', data);
        continue;
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
          payload: data.payload
        }
      });
      continue;
    }
    output.done();
  });
};
