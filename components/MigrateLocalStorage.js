const noflo = require('noflo');

// @runtime noflo-browser

const getGraph = (id) => {
  const json = localStorage.getItem(id);
  if (!json) { return null; }
  const graph = JSON.parse(json);
  graph.id = id;
  graph.project = '';
  return graph;
};

const getGraphs = () => {
  const graphIds = localStorage.getItem('noflo-ui-graphs');
  const graphs = [];
  if (!graphIds) { return graphs; }
  graphIds.split(',').forEach((id) => {
    const graph = getGraph(id);
    if (!graph) { return; }
    graphs.push(graph);
  });
  return graphs;
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('graphstore',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('graphstore')) { return; }
    const store = input.getData('graphstore');

    // Don't use localStorage in Chrome App
    if ((typeof chrome !== 'undefined') && chrome.storage) {
      output.done();
      return;
    }

    try {
      localStorage.getItem('noflo');
    } catch (e) {
      // No localStorage support, skip
      output.done();
      return;
    }

    const graphs = getGraphs();
    if (graphs.length === 0) {
      output.done();
      return;
    }
    let succeeded = 0;
    const success = () => {
      succeeded += 1;
      if (succeeded !== graphs.length) { return; }
      // TODO: Remove from localStorage?
      // localStorage.removeItem 'noflo-ui-graphs'
      output.done();
    };
    graphs.forEach((graph) => {
      const req = store.put(graph);
      req.onsuccess = success;
    });
  });
};
