const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.description = 'Strips state from action payloads for backwards compat';
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'all' });
  return c.process((input, output) => {
    const data = input.getData('in');
    output.sendDone({
      out: data.payload || data,
    });
  });
};
