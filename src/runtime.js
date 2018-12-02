const fbpGraph = require('fbp-graph');

const portForLibrary = port => ({
  name: port.id,
  type: port.type,
  description: port.type,
  addressable: port.addressable,
  schema: port.schema,
});

// Covert FBP Protocol component to the-graph library component
exports.componentForLibrary = component => ({
  name: component.name,
  icon: component.icon || 'cog',
  description: component.description || '',
  subgraph: component.subgraph,
  inports: component.inPorts.map(portForLibrary),
  outports: component.outPorts.map(portForLibrary),
});

exports.getGraphType = (g) => {
  const graph = g;
  if (!(graph.properties.environment != null ? graph.properties.environment.type : undefined) && ((graph.properties.environment != null ? graph.properties.environment.runtime : undefined) === 'html')) {
    // Legacy noflo-browser
    graph.properties.environment.type = 'noflo-browser';
  }
  if (graph.properties.environment != null ? graph.properties.environment.type : undefined) {
    return graph.properties.environment.type;
  }
  return null;
};

exports.getComponentType = (component) => {
  const runtimeType = component.code.match(/@runtime ([a-z-]+)/);
  if (runtimeType) {
    return runtimeType[1];
  }
  return null;
};

exports.getRemoteNodes = (client, r) => {
  const route = r;
  return route.remote.reduce(((promise, node) => promise.then((graph) => {
    if (!(graph.nodes != null ? graph.nodes.length : undefined)) {
      return Promise.reject(new Error(`Node ${graph.name} doesn't contain child nodes`));
    }
    const [matchedNode] = Array.from(graph.nodes.filter(n => n.id === node));
    if (!matchedNode) {
      return Promise.reject(new Error(`Node ${node} not found in graph ${graph.name || graph.properties.id}`));
    }
    return client.protocol.component.getsource({
      name: matchedNode.component,
    })
      .then((source) => {
        if (!['json', 'fbp'].includes(source.language)) {
          route.component = source;
          return Promise.resolve(source);
        }
        return exports.loadGraph(source)
          .then((instance) => {
            route.graphs.push(instance);
            return Promise.resolve(instance);
          });
      });
  })
  ), Promise.resolve(route.graphs[route.graphs.length - 1]))
    .then(() => {
      route.remote = [];
      return route;
    });
};

exports.loadGraph = source => new Promise(((resolve, reject) => {
  let method;
  switch (source.language) {
    case 'json': method = 'loadJSON'; break;
    case 'fbp': method = 'loadFBP'; break;
    default:
      return reject(new Error(`Unknown format ${source.language} for graph ${source.name}`));
  }
  method = source.language === 'json' ? 'loadJSON' : 'loadFBP';
  return fbpGraph.graph[method](source.code, (err, instance) => {
    if (err) { return reject(err); }
    return resolve(instance);
  });
}));

exports.isDefaultRuntime = (runtime) => {
  if ((runtime.protocol === 'iframe')
    && (runtime.address === 'https://noflojs.org/noflo-browser/everything.html?fbp_noload=true&fbp_protocol=iframe')) {
    return true;
  }
  return false;
};
