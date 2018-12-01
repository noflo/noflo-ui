const noflo = require('noflo');

exports.getComponent = function () {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'bang' });
  return c.process((input, output) => {
    if (!input.hasData('in')) { return; }
    input.getData('in');
    window.nofloDBReady = true;
    return output.done();
  });
};
