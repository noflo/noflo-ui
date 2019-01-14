const noflo = require('noflo');

const buildContext = function() {
  let ctx;
  return ctx = {
    state: '',
    project: null,
    runtime: null,
    component: null,
    graphs: [],
    remote: []
  };
};

const findProject = function(id, projects) {
  if (!projects) { return; }
  for (let project of Array.from(projects)) {
    if (project.id === id) { return project; }
  }
  return null;
};

const findGraph = function(id, project) {
  if (!project.graphs) { return; }
  for (let graph of Array.from(project.graphs)) {
    if (graph.name === id) { return graph; }
    if (graph.properties.id === id) { return graph; }
  }
  return null;
};

const findComponent = function(name, project) {
  if (!project.components) { return; }
  for (let component of Array.from(project.components)) {
    if (component.name === name) { return component; }
  }
  return null;
};

const findByComponent = function(componentName, project) {
  let [library, name] = Array.from(componentName.split('/'));

  if (!name) {
    name = library;
    library = undefined;
  }

  const graph = findGraph(name, project);
  if (graph) { return ['graph', graph]; }

  const component = findComponent(name, project);
  if (component) { return ['component', component]; }

  // Get from runtime
  return ['runtime', componentName];
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('in',
    {datatype: 'object'});
  c.outPorts.add('out',
    {datatype: 'object'});
  c.outPorts.add('error',
    {datatype: 'object'});
  return noflo.helpers.WirePattern(c, {
    async: true,
    forwardGroups: false
  }
  , function(data, groups, out, callback) {
    // Find project
    if (!(data.state.projects != null ? data.state.projects.length : undefined)) {
      return callback(new Error('No projects found'));
    }
    const ctx = buildContext();
    ctx.project = findProject(data.payload.project, data.state.projects);
    if (!ctx.project) {
      return callback(new Error(`Project ${data.payload.project} not found`));
    }

    // Find component if needed
    if (data.payload.component) {
      ctx.component = findComponent(data.payload.component, ctx.project);
      if (!ctx.component) {
        return callback(new Error(`Component ${data.payload.component} not found`));
      }
      ctx.state = 'ok';
      out.send(ctx);
      callback();
      return;
    }

    // Find main graph
    const mainGraph = findGraph(data.payload.graph, ctx.project);
    if (!mainGraph) {
      return callback(new Error(`Graph ${data.payload.graph} not found`));
    }
    ctx.graphs.push(mainGraph);

    // Look up the node tree
    let currentGraph = mainGraph;
    while (data.payload.nodes.length) {
      let type;
      const nodeId = data.payload.nodes.shift();
      if (typeof currentGraph !== 'object') {
        ctx.remote.push(nodeId);
        continue;
      }
      const node = currentGraph.getNode(nodeId);
      if (!node) {
        return callback(new Error(`Node ${nodeId} not found`));
      }
      if (!node.component) {
        return callback(new Error(`Node ${nodeId} has no component defined`));
      }
      [type, currentGraph] = Array.from(findByComponent(node.component, ctx.project));

      if (type === 'component') {
        ctx.component = currentGraph;
        if (data.payload.nodes.length) {
          return callback(new Error(`Component ${nodeId} cannot have subnodes`));
        }
        break;
      }

      if (type === 'runtime') {
        ctx.remote.push(nodeId);
        continue;
      }

      ctx.graphs.push(currentGraph);
    }

    ctx.state = ctx.remote.length ? 'loading' : 'ok';
    out.send(ctx);

    return callback();
  });
};
