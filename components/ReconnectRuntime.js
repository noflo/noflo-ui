const noflo = require('noflo');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('in',
    {datatype: 'object'});
  c.inPorts.add('client',
    {datatype: 'object'});
  c.outPorts.add('out',
    {datatype: 'object'});
  c.outPorts.add('error',
    {datatype: 'object'});
  return c.process(function(input, output) {
    if (!input.hasData('in', 'client')) { return; }
    const [data, client] = Array.from(input.getData('in', 'client'));

    return client.disconnect()
      .then(() => client.connect())
      .then(() =>
        output.send({
          out: client.definition})
      )
      .then((() => output.done()), err => output.done(err));
  });
};
