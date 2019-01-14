const noflo = require('noflo');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('in',
    {datatype: 'bang'});
  c.outPorts.add('out',
    {datatype: 'string'});
  return c.process(function(input, output) {
    if (!input.hasData('in')) { return; }
    input.getData('in');
    return output.sendDone({
      out: window.location.href.split('#')[1] || ''});
  });
};
