const noflo = require('noflo');
const path = require('path');
const uuid = require('uuid');
const projects = require('../src/projects');

const payloadToProject = function (data) {
  const repoParts = data.payload.repo.split('/');
  const payload = {
    project: {
      id: uuid.v4(),
      name: data.payload.repo,
      namespace: repoParts[1].replace(/^noflo-/, ''),
      repo: data.payload.repo,
      branch: data.payload.branch,
      graphs: [],
      components: [],
      specs: [],
    },
    repo: data.payload.repo,
  };
  return payload;
};

const openMainPayload = function () {
  let data;
  return data = {
    route: 'main',
    runtime: null,
    project: null,
    graph: null,
    component: null,
    nodes: [],
  };
};

const findGraph = function (name, project) {
  const base = path.basename(name, path.extname(name));
  for (const graph of Array.from(project.graphs)) {
    if (graph.name !== base) { continue; }
    return graph.properties.id;
  }
  return null;
};

const findComponent = function (name, project) {
  const base = path.basename(name, path.extname(name));
  for (const component of Array.from(project.components)) {
    if (component.name !== base) { continue; }
    return component.name;
  }
  return null;
};

exports.getComponent = function () {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('existing',
    { datatype: 'array' });
  c.outPorts.add('new',
    { datatype: 'object' });
  c.outPorts.add('openmain',
    { datatype: 'array' });
  return c.process((input, output) => {
    if (!input.hasData('in')) { return; }
    const data = input.getData('in');
    if (!__guard__(data.state != null ? data.state.projects : undefined, x => x.length)) {
      // No local projects, pass
      output.sendDone({
        openmain: openMainPayload(),
        new: payloadToProject(data),
      });
      return;
    }

    const existing = data.state.projects.filter((project) => {
      if (project.repo !== data.payload.repo) { return false; }
      if ((data.payload.branch === 'master') && !project.branch) {
        // master is default
        return true;
      }
      if (project.branch !== data.payload.branch) { return false; }
      return true;
    });
    if (!existing.length) {
      output.sendDone({
        openmain: openMainPayload(),
        new: payloadToProject(data),
      });
      return;
    }

    projects.getProjectHash(existing[0], (err, hash) => {
      if (!hash) {
        hash = [
          'project',
          existing[0].id,
          existing[0].main,
        ];
      }

      if (data.payload.component) {
        // Particular component requested
        const component = findComponent(data.payload.component, existing[0]);
        if (component) {
          hash[2] = 'component';
          hash[3] = component;
        }
      }
      if (data.payload.graph) {
        // Particular graph requested
        const graph = findGraph(data.payload.graph, existing[0]);
        if (graph) {
          delete hash[3];
          hash[2] = graph;
        }
      }

      return output.sendDone({ existing: hash });
    });
  });
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
