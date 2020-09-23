const noflo = require('noflo');
const { graphRuntimeIdentifier } = require('../src/runtime');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('client',
    { datatype: 'object' });
  c.inPorts.add('graphs',
    { datatype: 'array' });
  c.inPorts.add('project',
    { datatype: 'object' });
  c.inPorts.add('edges',
    { datatype: 'array' });
  c.outPorts.add('out',
    { datatype: 'array' });
  c.outPorts.add('error',
    { datatype: 'object' });
  return c.process((input, output) => {
    if (!input.hasData('client', 'graphs', 'project', 'edges')) { return; }
    const [client, graphs, project, edges] = input.getData('client', 'graphs', 'project', 'edges');
    output.send({ out: edges });
    if (!graphs.length) {
      output.done(new Error('No graph specified'));
      return;
    }
    const currentGraph = graphs[graphs.length - 1];
    const namespace = project ? project.namespace : null;
    client.protocol.network.edges({
      graph: graphRuntimeIdentifier(currentGraph, namespace),
      edges: edges.map((e) => {
        const edge = {
          src: e.from,
          tgt: e.to,
        };
        return edge;
      }),
    })
      .then((() => output.done()), (err) => output.done(err));
  });
};
