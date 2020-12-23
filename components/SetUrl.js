const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'bang' });

  return c.process((input, output) => {
    const { payload } = input.getData('in');
    window.location.href = payload;
    output.sendDone({
      out: true,
    });
  });
};
