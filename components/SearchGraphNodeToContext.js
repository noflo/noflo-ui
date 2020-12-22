const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('nodes',
    { datatype: 'array' });
  c.outPorts.add('context',
    { datatype: 'object' });
  return c.process((input, output) => {
    const nodes = input.getData('nodes');
    const ctx = { searchGraphResult: nodes };
    output.sendDone({
      context: ctx,
    });
  });
};
