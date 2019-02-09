const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('graph',
    { datatype: 'object' });
  c.inPorts.add('search',
    { datatype: 'string' });
  c.outPorts.add('nodes',
    { datatype: 'object' });

  return noflo.helpers.WirePattern(c, {
    in: 'search',
    params: ['graph'],
    out: 'nodes',
    async: true,
  },
  (search, groups, out, callback) => {
    if (search == null) {
      callback();
      return;
    }
    if (!c.params.graph) {
      callback();
      return;
    }

    if (search.length < 1) {
      out.send(null);
      callback();
      return;
    }

    const term = search.toLowerCase();
    c.params.graph.nodes.forEach((node) => {
      const name = node.metadata.label.toLowerCase();
      if (name.indexOf(term) >= 0) {
        out.send(node);
      }
    });
    callback();
  });
};
