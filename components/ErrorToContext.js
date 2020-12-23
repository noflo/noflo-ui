const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.icon = 'exclamation-triangle';
  c.inPorts.add('error',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });

  return c.process((input, output) => {
    const err = input.getData('error');
    output.sendDone({
      out: {
        state: 'error',
        error: err.payload || err,
      },
    });
  });
};
