const noflo = require('noflo');
const path = require('path');
const uuid = require('uuid');
const projects = require('../src/projects');

const payloadToProject = (data) => {
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

const openMainPayload = () => ({
  route: 'main',
  runtime: null,
  project: null,
  graph: null,
  component: null,
  nodes: [],
});

const findGraph = (name, project) => {
  const base = path.basename(name, path.extname(name));
  const matching = project.graphs.find((graph) => {
    if (graph.name !== base) { return false; }
    return true;
  });
  if (matching) {
    return matching.properties.id;
  }
  return null;
};

const findComponent = (name, project) => {
  const base = path.basename(name, path.extname(name));
  const matching = project.components.find((component) => {
    if (component.name !== base) { return false; }
    return true;
  });
  if (matching) {
    return matching.name;
  }
  return null;
};

exports.getComponent = () => {
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
    if (!data.state || !data.state.projects || !data.state.projects.length) {
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

    projects.getProjectHash(existing[0], (err, h) => {
      let hash = h;
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

      output.sendDone({ existing: hash });
    });
  });
};
