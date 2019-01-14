const noflo = require('noflo');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('client',
    {datatype: 'object'});
  c.inPorts.add('graphs',
    {datatype: 'array'});
  c.inPorts.add('edges',
    {datatype: 'array'});
  c.outPorts.add('out',
    {datatype: 'array'});
  c.outPorts.add('error',
    {datatype: 'object'});
  return c.process(function(input, output) {
    if (!input.hasData('client', 'graphs', 'edges')) { return; }
    const [client, graphs, edges] = Array.from(input.getData('client', 'graphs', 'edges'));
    output.send({
      out: edges});
    if (!graphs.length) {
      return output.done(new Error("No graph specified"));
    }
    const currentGraph = graphs[graphs.length - 1];
    return client.protocol.network.edges({
      graph: currentGraph.name || currentGraph.properties.id,
      edges: edges.map(function(e) {
        const edge = {
          src: e.from,
          tgt: e.to
        };
        return edge;})
    })
      .then((() => output.done()), err => output.done(err));
  });
};
