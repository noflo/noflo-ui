const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('client',
    { datatype: 'object' });
  c.inPorts.add('graphs',
    { datatype: 'array' });
  c.inPorts.add('edges',
    { datatype: 'array' });
  c.outPorts.add('out',
    { datatype: 'array' });
  c.outPorts.add('error',
    { datatype: 'object' });
  return c.process((input, output) => {
    if (!input.hasData('client', 'graphs', 'edges')) { return; }
    const [client, graphs, edges] = input.getData('client', 'graphs', 'edges');
    output.send({ out: edges });
    if (!graphs.length) {
      output.done(new Error('No graph specified'));
      return;
    }
    const currentGraph = graphs[graphs.length - 1];
    client.protocol.network.edges({
      graph: currentGraph.name || currentGraph.properties.id,
      edges: edges.map((e) => {
        const edge = {
          src: e.from,
          tgt: e.to,
        };
        return edge;
      }),
    })
      .then((() => output.done()), err => output.done(err));
  });
};
