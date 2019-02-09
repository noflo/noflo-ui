const noflo = require('noflo');
const collections = require('../src/collections');

const findProject = (entity, projects) => {
  const projectId = (entity.properties != null ? entity.properties.project : undefined)
    || entity.project;
  if (!projectId) {
    return null;
  }
  const matching = projects.filter(p => p.id === projectId);
  if (!matching.length) {
    return null;
  }
  return matching[0];
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.icon = 'database';
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return noflo.helpers.WirePattern(c, {
    out: 'out',
    forwardGroups: false,
    async: true,
  },
  (data, groups, out, callback) => {
    switch (data.action) {
      case 'storage:db': {
        const state = data.state || {};
        state.db = data.payload;
        out.send(state);
        callback();
        return;
      }
      case 'storage:opened': {
        out.send(data.payload);
        callback();
        return;
      }
      case 'storage:stored:initial': {
        const state = data.payload;

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
        state.projects.forEach((p) => {
          const project = p;
          project.graphs = state.storedGraphs.filter(item => item.properties.project
            === project.id);
          project.components = state.components.filter(item => item.project === project.id);
          project.specs = state.specs.filter(item => item.project === project.id);
        });

        out.send(state);
        callback();
        return;
      }
      case 'storage:stored:project': {
        const state = {};
        const project = data.payload;
        if (!project.graphs) { project.graphs = []; }
        if (data.state.storedGraphs && !project.graphs.length) {
          project.graphs = data.state.storedGraphs.filter(item => item.properties.project
            === project.id);
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
        callback();
        return;
      }
      case 'storage:removed:project': {
        const state = {};
        state.projects = data.state.projects || [];
        collections.removeFromList(state.projects,
          { id: data.payload });
        out.send(state);
        callback();
        return;
      }
      case 'storage:stored:graph': {
        const state = {};
        state.storedGraphs = data.state.storedGraphs || [];
        collections.addToList(state.storedGraphs, data.payload);
        state.projects = data.state.projects || [];
        const project = findProject(data.payload, state.projects);
        if (!project) {
          out.send(state);
          callback();
          return;
        }
        collections.addToList(project.graphs, data.payload);
        out.send(state);
        callback();
        return;
      }
      case 'storage:removed:graph': {
        const state = {};
        state.storedGraphs = data.state.storedGraphs || [];
        collections.removeFromList(state.storedGraphs, {
          properties: {
            id: data.payload,
          },
        });
        state.projects = data.state.projects || [];
        const project = findProject(data.payload, state.projects);
        if (!project) {
          out.send(state);
          callback();
          return;
        }
        collections.removeFromList(project.graphs, {
          properties: {
            id: data.payload,
          },
        });
        out.send(state);
        callback();
        return;
      }
      case 'storage:stored:component': {
        const state = {};
        state.components = data.state.components || [];
        collections.addToList(state.components, data.payload);
        state.projects = data.state.projects || [];
        const project = findProject(data.payload, state.projects);
        if (!project) {
          out.send(state);
          callback();
          return;
        }
        collections.addToList(project.components, data.payload);
        out.send(state);
        callback();
        return;
      }
      case 'storage:removed:component': {
        const state = {};
        state.components = data.state.components || [];
        collections.removeFromList(state.components,
          { id: data.payload });
        state.projects = data.state.projects || [];
        const project = findProject(data.payload, state.projects);
        if (!project) {
          out.send(state);
          callback();
          return;
        }
        collections.removeFromList(project.components,
          { id: data.payload });
        out.send(state);
        callback();
        return;
      }
      case 'storage:stored:spec': {
        const state = {};
        state.specs = data.state.specs || [];
        collections.addToList(state.specs, data.payload);
        state.projects = data.state.projects || [];
        const project = findProject(data.payload, state.projects);
        if (!project) {
          out.send(state);
          callback();
          return;
        }
        collections.addToList(project.specs, data.payload);
        out.send(state);
        callback();
        return;
      }
      case 'storage:removed:spec': {
        const state = {};
        state.specs = data.state.specs || [];
        collections.removeFromList(state.specs,
          { id: data.payload });
        state.projects = data.state.projects || [];
        const project = findProject(data.payload, state.projects);
        if (!project) {
          out.send(state);
          callback();
          return;
        }
        collections.removeFromList(project.specs,
          { id: data.payload });
        out.send(state);
        callback();
        return;
      }
      case 'storage:stored:runtime': {
        const state = {};
        state.runtimes = data.state.runtimes || [];
        collections.addToList(state.runtimes, data.payload, collections.sortBySeen);
        out.send(state);
        callback();
        return;
      }
      case 'storage:removed:runtime': {
        const state = {};
        state.runtimes = data.state.runtimes || [];
        collections.removeFromList(state.runtimes,
          { id: data.payload });
        out.send(state);
        callback();
        return;
      }
      case 'storage:error': {
        const state = {
          state: 'error',
          error: data.payload,
        };
        out.send(state);
        callback();
        return;
      }
      default: {
        callback();
      }
    }
  });
};
