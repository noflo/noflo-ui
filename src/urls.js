exports.getComponentHash = (componentName, project) => {
  if (project.runtime) {
    // Live mode
    return [
      'runtime',
      project.runtime,
      'component',
      componentName,
    ];
  }
  return [
    'project',
    project.id,
    'component',
    componentName,
  ];
};

exports.getGraphHash = (graphId, project) => {
  if (project.runtime) {
    // Live mode
    return [
      'runtime',
      project.runtime,
      graphId,
    ];
  }
  return [
    'project',
    project.id,
    graphId,
  ];
};

exports.hashToString = (hash) => `#${hash.map((part) => encodeURIComponent(part)).join('/')}`;
