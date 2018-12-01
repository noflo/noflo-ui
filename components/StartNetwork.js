const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('client',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });
  return c.process((input, output) => {
    if (!input.hasData('in', 'client')) { return; }
    const [data, client] = Array.from(input.getData('in', 'client'));

    const graphId = data.graph.name || data.graph.properties.id;
    client.connect()
      .then(() => client.protocol.network.start({
        graph: graphId,
      }))
      .then(status => output.send({
        out: {
          status,
          runtime: client.definition.id,
        },
      }))
      .then((() => output.done()), err => output.done(err));
  });
};
