exports.findMainGraph = (project) => {
  if (!project.graphs.length) { return null; }
  if (project.main) {
    // Ensure currently set main graph exists
    const mainFound = project.graphs.find((graph) => graph.properties.id === project.main);
    if (mainFound) {
      return project.main;
    }
  }
  // No 'main' graph sent, see if we can make a smart choice
  const mainCapable = project.graphs.find((graph) => {
    if (graph.name === 'main') { return true; }
    if (graph.properties.main) { return true; }
    return false;
  });
  if (mainCapable) {
    return mainCapable.properties.id;
  }
  // No suitable graph found, use first
  return project.graphs[0].properties.id;
};

exports.findGraph = (id, project) => {
  if (!project.graphs) { return null; }
  return project.graphs.find((graph) => {
    if (graph.name === id) { return true; }
    if (graph.properties.id === id) { return true; }
    return false;
  });
};

exports.findComponent = (name, project) => {
  if (!project.components) { return null; }
  return project.components.find((component) => {
    if (component.name === name) { return true; }
    return false;
  });
};

exports.findByComponent = (componentName, project) => {
  let [library, name] = componentName.split('/');

  if (!name) {
    name = library;
    library = undefined;
  }

  const graph = exports.findGraph(name, project);
  if (graph) { return ['graph', graph]; }

  const component = exports.findComponent(name, project);
  if (component) { return ['component', component]; }

  // Get from runtime
  return ['runtime', componentName];
};

exports.findProject = (id, projects) => {
  if (!projects) { return null; }

  return projects.find((project) => project.id === id);
};

exports.getProjectHash = (project, callback) => {
  if (project.runtime) {
    if (!project.main) {
      callback(null, [
        'runtime',
        project.runtime,
      ]);
      return;
    }
    callback(null, [
      'runtime',
      project.runtime,
      project.main,
    ]);
    return;
  }
  if (!project.graphs.length) {
    if (project.components.length) {
      // No graphs in this project, but there are components
      callback(null, [
        'project',
        project.id,
        'component',
        project.components[0].name,
      ]);
      return;
    }
    setTimeout(() => {
      // Wait for graphs to be populated
      if (!project.graphs.length && !project.components.length) {
        return callback(new Error(`Project ${project.id} has no graphs or components`));
      }
      return exports.getProjectHash(project, callback);
    },
    100);
    return;
  }
  // Open main graph, or the first graph
  const main = project.main || project.graphs[0].properties.id;
  if (!main) {
    callback(new Error(`Unable find a main graph for project ${project.id}`));
    return;
  }
  callback(null, [
    'project',
    project.id,
    main,
  ]);
};

exports.isReadOnly = (context) => {
  if (!context.project) {
    // If there is no project we must be read-only
    return true;
  }
  if (context.graph && context.project.graphs.indexOf(context.graph) === -1) {
    // Graph is outside the project, go read-only
    return true;
  }
  if (context.component && context.project.components.indexOf(context.component) === -1) {
    // Graph is outside the project, go read-only
    return true;
  }
  if (context.graph
    && context.runtime
    && context.runtime.definition
    && context.runtime.definition.capabilities) {
    return (context.runtime.definition.capabilities.indexOf('protocol:graph') === -1);
  }
  if (context.component
    && context.runtime
    && context.runtime.definition
    && context.runtime.definition.capabilities) {
    return (context.runtime.definition.capabilities.indexOf('component:setsource') === -1);
  }
  return false;
};

exports.guessLanguage = (code, defaultLanguage = 'javascript') => {
  if (code.indexOf('topic: ') !== -1 && code.indexOf('cases:') !== -1) {
    // Reasonable guess is that this is an fbp-spec file.
    // Should probably try parsing YAML to be sure.
    return 'yaml';
  }
  return defaultLanguage;
};
