const fbpGraph = require('fbp-graph');
const { findByComponent } = require('./projects');
const { getName, namespace } = require('./collections');

exports.graphRuntimeIdentifier = (graph, projectNamespace = null) => {
  if (graph && graph.properties && graph.properties.runtimeName) {
    // Runtime-supplied identifier, keep stable
    return graph.properties.runtimeName;
  }
  const graphName = getName(graph);
  if (projectNamespace) {
    return namespace(graphName, projectNamespace);
  }
  return graphName;
};

const portForLibrary = (port) => ({
  name: port.id,
  type: port.type,
  description: port.type,
  addressable: port.addressable,
  schema: port.schema,
});

// Covert FBP Protocol component to the-graph library component
exports.componentForLibrary = (component) => ({
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

exports.getSource = (client, name) => client
  .protocol.component.getsource({
    name,
  })
  .catch((e) => {
    if (name.indexOf('/') !== -1) {
      // Already namespaced, pass failure through
      return Promise.reject(e);
    }
    if (!client.definition.namespace) {
      // No namespace defined, pass failure through
      return Promise.reject(e);
    }
    return client.protocol.component.getsource({
      name: `${client.definition.namespace}/${name}`,
    });
  });

exports.getRemoteNodes = (client, r) => {
  const route = r;
  return route.remote.reduce(((promise, node) => promise.then((graph) => {
    if (!(graph.nodes != null ? graph.nodes.length : undefined)) {
      return Promise.reject(new Error(`Node ${graph.name} doesn't contain child nodes`));
    }
    const [matchedNode] = graph.nodes.filter((n) => n.id === node);
    if (!matchedNode) {
      return Promise.reject(new Error(`Node ${node} not found in graph ${graph.name || graph.properties.id}`));
    }

    // Check if the node implementation is available in the local project
    const [
      componentType,
      componentImplementation,
    ] = findByComponent(matchedNode.component, route.project);
    if (componentType === 'graph') {
      route.graphs.push(componentImplementation);
      return Promise.resolve(componentImplementation);
    }
    if (componentType === 'component') {
      route.component = componentImplementation;
      return Promise.resolve(componentImplementation);
    }
    // If not, then get from runtime
    return exports.getSource(client, matchedNode.component)
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

exports.loadGraph = (source) => {
  let method;
  switch (source.language) {
    case 'json': method = 'loadJSON'; break;
    case 'fbp': method = 'loadFBP'; break;
    default:
      return Promise.reject(new Error(`Unknown format ${source.language} for graph ${source.name}`));
  }
  method = source.language === 'json' ? 'loadJSON' : 'loadFBP';
  return fbpGraph.graph[method](source.code)
    .then((i) => {
      const instance = i;
      instance.name = source.name;
      return instance;
    });
};

exports.isDefaultRuntime = (runtime) => {
  if ((runtime.protocol === 'iframe')
    && (runtime.address === 'https://noflojs.org/noflo-browser/everything.html?fbp_noload=true&fbp_protocol=iframe')) {
    return true;
  }
  return false;
};

// Scope iframe runtimes to project
exports.ensureIframe = (c, project) => {
  const client = c;
  if (client.definition.protocol !== 'iframe') {
    return Promise.resolve();
  }
  client.definition.querySelector = `iframe[data-runtime='${client.definition.id}']`;
  let iframe = document.body.querySelector(client.definition.querySelector);
  if (!iframe) {
    // No iframe for this runtime/project combination yet, create
    iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    iframe.setAttribute('data-runtime', client.definition.id);
    iframe.setAttribute('data-project', project.id);
    iframe.className = 'iframe-runtime';
    document.body.appendChild(iframe);
  }
  if (!client.transport.iframe) {
    // Client has not been connected yet
    client.transport.iframe = iframe;
    return Promise.resolve();
  }
  if (client.transport.iframe === iframe) {
    // We were already connected to this one
    return Promise.resolve();
  }
  // We were connected to another iframe
  // Disconnect and set new
  return client.disconnect()
    .then(() => {
      client.transport.iframe = iframe;
      return Promise.resolve();
    });
};
