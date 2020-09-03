const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in', {
    datatype: 'object',
  });
  c.inPorts.add('client', {
    datatype: 'object',
  });
  c.outPorts.add('project',
    { datatype: 'object' });
  c.outPorts.add('graph',
    { datatype: 'object' });
  c.outPorts.add('component',
    { datatype: 'object' });
  c.outPorts.add('runtime',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('in', 'client')) { return; }
    input.getData('in', 'client');
    output.done(new Error('Edit as Project is no longer supported'));
  });
};
