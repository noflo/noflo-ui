const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('graph', {
    datatype: 'object',
    control: true,
  });
  c.inPorts.add('search', {
    datatype: 'string',
  });
  c.outPorts.add('nodes', {
    datatype: 'object',
  });

  return c.process((input, output) => {
    if (!input.hasData('search', 'graph')) {
      return;
    }
    const [search, graph] = input.getData('search', 'graph');
    if (search.length < 1) {
      output.sendDone({
        nodes: null,
      });
      return;
    }

    const term = search.toLowerCase();
    graph.nodes.forEach((node) => {
      const name = node.metadata.label.toLowerCase();
      if (name.indexOf(term) >= 0) {
        output.send({
          nodes: node,
        });
      }
    });
    output.done();
  });
};
