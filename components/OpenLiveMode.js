const noflo = require('noflo');
const { v4: uuid } = require('uuid');
const url = require('url');
const path = require('path');
const {
  loadGraph,
  ensureIframe,
  getRemoteNodes,
  getSource,
} = require('../src/runtime');
const {
  findGraph,
  findComponent,
} = require('../src/projects');
const { addToList } = require('../src/collections');

const getNamespace = (client) => {
  if (!client.definition || !client.definition.namespace) {
    return null;
  }
  return client.definition.namespace;
};

const isComponentInProject = (namespace, componentName) => {
  if (componentName.indexOf('/') === -1 && componentName !== 'Graph') { return true; }
  const [library] = componentName.split('/');
  return library === namespace;
};

const fetchFromLibrary = (namespace, client) => {
  if (!namespace) { return Promise.resolve([]); }
  return client.connect()
    .then(() => client.protocol.component.list())
    .then(components => components
      .map(component => component.name)
      .filter(name => isComponentInProject(namespace, name)))
    .then(components => Promise.all(components.map(name => getSource(client, name))));
};

const ensureProject = (client, projects) => {
  const matching = projects.find((proj) => {
    if (proj.runtime && proj.runtime === client.definition.id) {
      return true;
    }
    return false;
  });
  if (matching) {
    // We already have a project for this runtime
    return matching;
  }
  const project = {
    id: uuid(),
    name: getNamespace(client),
    namespace: getNamespace(client),
    runtime: client.definition.id,
    type: client.definition.type,
    graphs: [],
    components: [],
    specs: [],
  };
  return project;
};

const updateProjectMetadata = (client, p) => {
  const project = p;
  if (client.definition.repository) {
    const parsed = url.parse(client.definition.repository);
    if ((parsed.hostname === 'github.com') && parsed.pathname) {
      const pathname = parsed.pathname.slice(1);
      const org = path.dirname(pathname);
      const repo = path.basename(pathname, path.extname(pathname));
      project.repo = `${org}/${repo}`;
      project.name = repo;
    }
  }
  if (client.definition.repositoryVersion) {
    project.branch = client.definition.repositoryVersion;
  }
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('client',
    { datatype: 'object' });
  c.inPorts.add('projects',
    { datatype: 'object' });
  c.outPorts.add('out',
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

  return c.process((input, output) => {
    if (!input.hasData('in', 'client', 'projects')) { return; }
    const [route, client, projects] = input.getData('in', 'client', 'projects');

    const state = {
      state: 'ok',
      graphs: [],
      remote: route.nodes || [],
      project: {},
      component: null,
      runtime: route.runtime,
    };

    Promise.resolve()
      .then(() => ensureIframe(client, {
        id: uuid(),
      }))
      .then(() => client.connect())
      .then((def) => {
        // Start by loading main graph
        if (!def.graph) {
          return Promise.reject(new Error(`Runtime ${def.id} is not running a graph`));
        }

        state.project = ensureProject(client, projects);
        updateProjectMetadata(client, state.project);

        return getSource(client, def.graph);
      })
      .then(source => loadGraph(source))
      .then((graphInstance) => {
        graphInstance.setProperties({
          id: `${state.project.id}/${(graphInstance.properties != null ? graphInstance.properties.id : undefined) || graphInstance.name}`,
          project: state.project.id,
          // Ensure graph communications use the name runtime supplied
          runtimeName: client.definition.graph,
        });
        addToList(state.project.graphs, graphInstance);
        state.project.main = graphInstance.properties.id;
      })
      .then(() => fetchFromLibrary(state.project.namespace, client))
      .then((sources) => {
        const projectGraphs = sources.filter((component) => {
          if (component.language !== 'json') {
            return false;
          }
          if (component.name === client.definition.graph || `${component.library}/${component.name}` === client.definition.graph) {
            return false;
          }
          return true;
        });
        return Promise.all(projectGraphs.map(graphDef => loadGraph(graphDef)
          .then((g) => {
            const graph = g;
            graph.name = path.basename(graphDef.name);
            graph.setProperties({
              id: `${state.project.id}/${(graph.properties != null ? graph.properties.id : undefined) || graph.name}`,
              project: state.project.id,
            });
            return graph;
          })))
          .then((graphs) => {
            graphs.forEach((g) => {
              addToList(state.project.graphs, g);
            });
            const components = sources.filter(comp => comp.language !== 'json');
            components.forEach((comp) => {
              const component = comp;
              component.project = state.project.id;
              component.id = `${state.project.id}/${component.name}`;
              addToList(state.project.components, component);
            });
          });
      })
      .then(() => {
        // Associate runtime with project for auto-connecting
        client.definition.project = state.project.id;
        client.definition.seen = new Date();
        if (!client.definition.label) {
          client.definition.label = `${state.project.name} runtime`;
        }
      })
      .then(() => {
        if (route.component) {
          state.component = findComponent(route.component, state.project);
          if (!state.component) {
            throw new Error(`Component ${route.component} not found`);
          }
          return;
        }
        const mainGraph = findGraph(route.graph || state.project.main, state.project);
        if (!mainGraph) {
          throw new Error(`Graph ${route.graph || state.project.main} not found`);
        }
        addToList(state.graphs, mainGraph);
      })
      .then(() => getRemoteNodes(client, state))
      .then(() => output.send({
        out: state,
        project: state.project,
      }))
      .then(() => {
        state.project.graphs.forEach((graph) => {
          output.send({
            graph,
          });
        });
        state.project.components.forEach((component) => {
          output.send({
            component,
          });
        });
      })
      .then((() => output.done()), err => output.done(err));
  });
};
