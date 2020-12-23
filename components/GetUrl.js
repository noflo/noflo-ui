const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'bang' });
  c.outPorts.add('out',
    { datatype: 'string' });
  return c.process((input, output) => {
    input.getData('in');
    output.sendDone({
      out: window.location.href,
    });
  });
};
