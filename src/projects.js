exports.findMainGraph = (project) => {
  if (!project.graphs.length) { return null; }
  if (project.main) {
    // Ensure currently set main graph exists
    const mainFound = project.graphs.find(graph => graph.properties.id === project.main);
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

exports.getProjectHash = (project, callback) => {
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
