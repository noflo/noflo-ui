const noflo = require('noflo');
const uuid = require('uuid');
const url = require('url');
const path = require('path');

const getNamespace = (client) => {
  if (!client.definition || !client.definition.namespace) {
    return null;
  }
  return client.definition.namespace;
};

const isComponentInProject = (namespace, componentName) => {
  if (componentName.indexOf('/') === -1) { return true; }
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
    .then(components => Promise.all(components.map(name => client
      .protocol.component.getsource({
        name,
      }))));
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in', {
    datatype: 'object',
  });
  c.inPorts.add('client', {
    datatype: 'object',
  });
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
    if (!input.hasData('in', 'client')) { return; }
    const [data, client] = input.getData('in', 'client');
    const project = {
      id: uuid.v4(),
      namespace: getNamespace(client),
      graphs: [],
      components: [],
      specs: [],
    };
    if (project.namespace) {
      project.name = project.namespace;
    }

    if (client.definition && client.definition.repository) {
      const parsed = url.parse(client.definition.repository);
      if ((parsed.hostname === 'github.com') && parsed.pathname) {
        const pathname = parsed.pathname.slice(1);
        const org = path.dirname(pathname);
        const repo = path.basename(pathname, path.extname(pathname));
        project.repo = `${org}/${repo}`;
        project.name = project.repo;
      }
    }
    if (client.definition && client.definition.repositoryVersion) {
      project.branch = client.definition.repositoryVersion;
    }

    // Start with the data we already have
    const graphs = data.graphs ? data.graphs.slice(0) : [];
    let components = [];
    if (data.payload.component) { components.push(data.payload.component); }

    // Add components and graphs from library
    fetchFromLibrary(project.namespace, client)
      .then((sources) => {
        const projectGraphs = sources.filter(component => component.language === 'json');
        projectGraphs.forEach((graphDef) => {
          noflo.graph.loadJSON(graphDef, (err, graph) => {
            if (err) { return; }
            graphs.push(graph);
          });
        });

        components = components.concat(sources.filter(comp => comp.language !== 'json'));

        graphs.forEach((g) => {
          const graph = g;
          graph.name = graph.name.split('/').pop();
          graph.setProperties({
            id: `${project.id}/${(graph.properties != null ? graph.properties.id : undefined) || graph.name}`,
            project: project.id,
          });
          if (!project.main) { project.main = graph.properties.id; }
          if (!project.name) { project.name = graph.name; }
          if (graph.properties
            && graph.properties.environment
            && graph.properties.environment.type
            && !project.type) {
            project.type = graph.properties.environment.type;
          }
          project.graphs.push(graph);
        });

        components.forEach((comp) => {
          const component = comp;
          component.project = project.id;
          project.components.push(component);
        });

        // Associate runtime with project for auto-connecting
        client.definition.project = project.id;
        client.definition.seen = new Date();
        if (!client.definition.label) {
          client.definition.label = `${project.name} runtime`;
        }
        output.send({
          runtime: client.definition,
          project,
        });

        project.graphs.forEach((graph) => {
          output.send({
            graph,
          });
        });
        project.components.forEach((component) => {
          output.send({
            component,
          });
        });
        output.done();
      }, output.done);
  });
};
