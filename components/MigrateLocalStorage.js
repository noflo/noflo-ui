const noflo = require('noflo');

// @runtime noflo-browser

const getGraphs = function() {
  const graphIds = localStorage.getItem('noflo-ui-graphs');
  const graphs = [];
  if (!graphIds) { return graphs; }
  const ids = graphIds.split(',');
  for (let id of Array.from(ids)) {
    const graph = getGraph(id);
    if (!graph) { continue; }
    graphs.push(graph);
  }
  return graphs;
};

var getGraph = function(id) {
  const json = localStorage.getItem(id);
  if (!json) { return; }
  const graph = JSON.parse(json);
  graph.id = id;
  graph.project = '';
  return graph;
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('graphstore',
    {datatype: 'object'});


  return c.process(function(input, output) {
    if (!input.hasData('graphstore')) { return; }
    const store = input.getData('graphstore');

    // Don't use localStorage in Chrome App
    if ((typeof chrome !== 'undefined') && chrome.storage) {
      return output.done();
    }

    try {
      localStorage;
    } catch (e) {
      // No localStorage support, skip
      return output.done();
    }

    const graphs = getGraphs();
    if (graphs.length === 0) { return output.done(); }
    let succeeded = 0;
    const success = function() {
      succeeded++;
      if (succeeded !== graphs.length) { return; }
      // TODO: Remove from localStorage?
      // localStorage.removeItem 'noflo-ui-graphs'
      return output.done();
    };
    return graphs.forEach(function(graph) {
      const req = store.put(graph);
      return req.onsuccess = success;
    });
  });
};
