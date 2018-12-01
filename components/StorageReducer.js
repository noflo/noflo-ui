const noflo = require('noflo');
const collections = require('../src/collections');

const findProject = function(entity, projects) {
  const projectId = (entity.properties != null ? entity.properties.project : undefined) || entity.project;
  if (!projectId) { return null; }
  for (let project of Array.from(projects)) {
    if (project.id !== projectId) { continue; }
    return project;
  }
  return null;
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.icon = 'database';
  c.inPorts.add('in',
    {datatype: 'object'});
  c.outPorts.add('out',
    {datatype: 'object'});
  c.outPorts.add('error',
    {datatype: 'object'});

  return noflo.helpers.WirePattern(c, {
    out: 'out',
    forwardGroups: false,
    async: true
  }
  , function(data, groups, out, callback) {
    let project;
    switch (data.action) {
      case 'storage:db':
        var state = data.state || {};
        state.db = data.payload;
        out.send(state);
        return callback();
      case 'storage:opened':
        out.send(data.payload);
        return callback();
      case 'storage:stored:initial':
        state = data.payload;

        // Rename graphs list
        state.storedGraphs = state.graphs;
        delete state.graphs;

        // Ensure consistent order
        state.projects.sort(collections.sortByName);
        state.storedGraphs.sort(collections.sortByName);
        state.components.sort(collections.sortByName);
        state.specs.sort(collections.sortByName);
        state.runtimes.sort(collections.sortBySeen);

        // Update project graphs etc
        for (project of Array.from(state.projects)) {
          project.graphs = state.storedGraphs.filter(item => item.properties.project === project.id);
          project.components = state.components.filter(item => item.project === project.id);
          project.specs = state.specs.filter(item => item.project === project.id);
        }

        out.send(state);
        return callback();
      case 'storage:stored:project':
        state = {};
        project = data.payload;
        if (!project.graphs) { project.graphs = []; }
        if (data.state.storedGraphs && !project.graphs.length) {
          project.graphs = data.state.storedGraphs.filter(item => item.properties.project === project.id);
        }
        if (!project.components) { project.components = []; }
        if (data.state.components && !project.components.length) {
          project.components = data.state.components.filter(item => item.project === project.id);
        }
        if (!project.specs) { project.specs = []; }
        if (data.state.specs && !project.specs.length) {
          project.specs = data.state.specs.filter(item => item.project === project.id);
        }
        state.projects = data.state.projects || [];
        collections.addToList(state.projects, project);
        out.send(state);
        return callback();
      case 'storage:removed:project':
        state = {};
        state.projects = data.state.projects || [];
        collections.removeFromList(state.projects,
          {id: data.payload});
        out.send(state);
        return callback();
      case 'storage:stored:graph':
        state = {};
        state.storedGraphs = data.state.storedGraphs || [];
        collections.addToList(state.storedGraphs, data.payload);
        state.projects = data.state.projects || [];
        project = findProject(data.payload, state.projects);
        if (!project) {
          out.send(state);
          callback();
          return;
        }
        collections.addToList(project.graphs, data.payload);
        out.send(state);
        return callback();
      case 'storage:removed:graph':
        state = {};
        state.storedGraphs = data.state.storedGraphs || [];
        collections.removeFromList(state.storedGraphs, {
          properties: {
            id: data.payload
          }
        }
        );
        state.projects = data.state.projects || [];
        project = findProject(data.payload, state.projects);
        if (!project) {
          out.send(state);
          callback();
          return;
        }
        collections.removeFromList(project.graphs, {
          properties: {
            id: data.payload
          }
        }
        );
        out.send(state);
        return callback();
      case 'storage:stored:component':
        state = {};
        state.components = data.state.components || [];
        collections.addToList(state.components, data.payload);
        state.projects = data.state.projects || [];
        project = findProject(data.payload, state.projects);
        if (!project) {
          out.send(state);
          callback();
          return;
        }
        collections.addToList(project.components, data.payload);
        out.send(state);
        return callback();
      case 'storage:removed:component':
        state = {};
        state.components = data.state.components || [];
        collections.removeFromList(state.components,
          {id: data.payload});
        state.projects = data.state.projects || [];
        project = findProject(data.payload, state.projects);
        if (!project) {
          out.send(state);
          callback();
          return;
        }
        collections.removeFromList(project.components,
          {id: data.payload});
        out.send(state);
        return callback();
      case 'storage:stored:spec':
        state = {};
        state.specs = data.state.specs || [];
        collections.addToList(state.specs, data.payload);
        state.projects = data.state.projects || [];
        project = findProject(data.payload, state.projects);
        if (!project) {
          out.send(state);
          callback();
          return;
        }
        collections.addToList(project.specs, data.payload);
        out.send(state);
        return callback();
      case 'storage:removed:spec':
        state = {};
        state.specs = data.state.specs || [];
        collections.removeFromList(state.specs,
          {id: data.payload});
        state.projects = data.state.projects || [];
        project = findProject(data.payload, state.projects);
        if (!project) {
          out.send(state);
          callback();
          return;
        }
        collections.removeFromList(project.specs,
          {id: data.payload});
        out.send(state);
        return callback();
      case 'storage:stored:runtime':
        state = {};
        state.runtimes = data.state.runtimes || [];
        collections.addToList(state.runtimes, data.payload, collections.sortBySeen);
        out.send(state);
        return callback();
      case 'storage:removed:runtime':
        state = {};
        state.runtimes = data.state.runtimes || [];
        collections.removeFromList(state.runtimes,
          {id: data.payload});
        out.send(state);
        return callback();
      case 'storage:error':
        state = {
          state: 'error',
          error: data.payload
        };
        out.send(state);
        return callback();
      default:
        return callback();
    }
  });
};
