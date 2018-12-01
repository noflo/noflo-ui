const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('missed',
    { datatype: 'object' });
  return c.process((input, output) => {
    if (!input.hasData('in')) { return; }
    const data = input.getData('in');
    if (!data.state.runtime) {
      output.sendDone({ missed: data });
      return;
    }
    output.sendDone({ out: data });
  });
};
