const noflo = require('noflo');
const uuid = require('uuid');
const url = require('url');
const path = require('path');

const isComponentInProject = (namespace, componentName) => {
  if (componentName.indexOf('/') === -1) { return true; }
  const [library] = componentName.split('/');
  return library === namespace;
};

const fetchSources = (components, runtime, sources, callback) => {
  if (!components.length) { return callback(null, sources); }
  const handleMessage = (msg) => {
    if (msg.command === 'error') {
      callback(new Error(msg.payload.message));
      return;
    }
    if (msg.command === 'source') {
      sources.push(msg.payload);
      fetchSources(components, runtime, sources, callback);
      return;
    }
    // We got unrelated message, subscribe again
    runtime.once('component', handleMessage);
  };
  runtime.once('component', handleMessage);
  const component = components.shift();
  return runtime.sendComponent('getsource',
    { name: component });
};

const fetchFromLibrary = (namespace, runtime, callback) => {
  if (!namespace) { return callback(null, []); }
  if (!runtime.isConnected()) { return callback(null, []); }
  if (!runtime.canDo('component:getsource')) { return callback(null, []); }
  if (!runtime.definition.components) { return callback(null, []); }
  const components = Object.keys(runtime.definition.components).filter(
    componentName => isComponentInProject(namespace, componentName),
  );
  return fetchSources(components, runtime, [], callback);
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('project',
    { datatype: 'object' });
  c.outPorts.add('graph',
    { datatype: 'object' });
  c.outPorts.add('component',
    { datatype: 'object' });
  c.outPorts.add('runtime',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return noflo.helpers.WirePattern(c, {
    in: 'in',
    out: ['project', 'graph', 'component', 'runtime'],
    forwardGroups: false,
    async: true,
  },
  (data, groups, out, callback) => {
    const project = {
      id: uuid.v4(),
      namespace: __guard__(data.payload.runtime != null ? data.payload.runtime.definition : undefined, x => x.namespace),
      graphs: [],
      components: [],
      specs: [],
    };
    if (project.namespace) { project.name = project.namespace; }

    if (__guard__(data.payload.runtime != null ? data.payload.runtime.definition : undefined, x1 => x1.repository) && (typeof data.payload.runtime.definition.repository === 'string')) {
      const parsed = url.parse(data.payload.runtime.definition.repository);
      if ((parsed.hostname === 'github.com') && parsed.pathname) {
        const pathname = parsed.pathname.slice(1);
        const org = path.dirname(pathname);
        const repo = path.basename(pathname, path.extname(pathname));
        project.repo = `${org}/${repo}`;
        project.name = project.repo;
      }
    }
    if (__guard__(data.payload.runtime != null ? data.payload.runtime.definition : undefined, x2 => x2.repositoryVersion)) {
      project.branch = data.payload.runtime.definition.repositoryVersion;
    }

    // Start with the data we already have
    const graphs = data.payload.graphs.slice(0);
    let components = [];
    if (data.payload.component) { components.push(data.payload.component); }

    // Add components and graphs from library
    return fetchFromLibrary(project.namespace, data.payload.runtime, (err, sources) => {
      let component; let
        graph;
      if (err) { return callback(err); }
      const projectGraphs = sources.filter(component => component.language === 'json');
      projectGraphs.forEach((graphDef) => {
        noflo.graph.loadJSON(graphDef, (err, graph) => {
          if (err) { return; }
          return graphs.push(graph);
        });
      });

      components = components.concat(sources.filter(c => c.language !== 'json'));

      for (graph of Array.from(graphs)) {
        graph.name = graph.name.split('/').pop();
        graph.setProperties({
          id: `${project.id}/${(graph.properties != null ? graph.properties.id : undefined) || graph.name}`,
          project: project.id,
        });
        if (!project.main) { project.main = graph.properties.id; }
        if (!project.name) { project.name = graph.name; }
        if (__guard__(graph.properties != null ? graph.properties.environment : undefined, x3 => x3.type) && !project.type) {
          project.type = graph.properties.environment.type;
        }
        project.graphs.push(graph);
      }

      for (component of Array.from(components)) {
        component.project = project.id;
        project.components.push(component);
      }

      // Associate runtime with project for auto-connecting
      data.payload.runtime.definition.project = project.id;
      data.payload.runtime.definition.seen = new Date();
      if (!data.payload.runtime.definition.label) {
        data.payload.runtime.definition.label = `${project.name} runtime`;
      }
      out.runtime.send(data.payload.runtime.definition);

      out.project.send(project);

      for (graph of Array.from(project.graphs)) {
        out.graph.send(graph);
      }
      for (component of Array.from(project.components)) {
        out.component.send(component);
      }

      return callback();
    });
  });
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
