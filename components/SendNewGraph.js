const noflo = require('noflo');
const { getGraphType } = require('../src/runtime');

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

    const { graph } = data;
    const graphType = getGraphType(graph);
    if (graphType && (graphType !== client.definition.type)) {
      // Ignore components for different runtime type
      output.done();
      return;
    }

    client.connect()
      .then(() => client.protocol.graph.send(graph, graph.properties.main))
      .then((() => output.sendDone({
        out: data,
      })), err => output.done(err));
  });
};
