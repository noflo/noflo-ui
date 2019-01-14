const noflo = require('noflo');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('graph',
    {datatype: 'object'});
  c.inPorts.add('search',
    {datatype: 'string'});
  c.outPorts.add('nodes',
    {datatype: 'object'});

  return noflo.helpers.WirePattern(c, {
    in: 'search',
    params: ['graph'],
    out: 'nodes',
    async: true
  }
  , function(search, groups, out, callback) {
    if (search == null) { return callback(); }
    if (!c.params.graph) { return callback(); }

    if (search.length < 1) {
      out.send(null);
      callback();
      return;
    }

    const term = search.toLowerCase();
    for (let node of Array.from(c.params.graph.nodes)) {
      const name = node.metadata.label.toLowerCase();
      if (name.indexOf(term) >= 0) {
        out.send(node);
      }
    }
    return callback();
  });
};
