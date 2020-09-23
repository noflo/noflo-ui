const noflo = require('noflo');
const { graphRuntimeIdentifier } = require('../src/runtime');

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
    const [data, client] = input.getData('in', 'client');

    const namespace = data.project ? data.project.namespace : null;
    client.connect()
      .then(() => client.protocol.network.stop({
        graph: graphRuntimeIdentifier(data.graph, namespace),
      }))
      .then((status) => output.send({
        out: {
          status,
          runtime: client.definition.id,
        },
      }))
      .then((() => output.done()), (err) => output.done(err));
  });
};
