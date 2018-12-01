const noflo = require('noflo');
const uuid = require('uuid');
const collections = require('../src/collections');
const projects = require('../src/projects');

const handleGraph = function(sha, content, entry, project, callback) {
  // Start by loading the graph object
  let method = 'loadJSON';
  if (entry.remote.language === 'fbp') { method = 'loadFBP'; }
  if (entry.remote.language === 'json') { content = JSON.parse(content); }
  return noflo.graph[method](content, function(err, graph) {
    if (err) {
      callback(new Error(`Failed to load ${entry.remote.name}: ${err.message}`));
      return;
    }
    // Properties that need to be changed for both cases
    if (!graph.properties) { graph.properties = {}; }
    graph.properties.sha = sha;
    graph.properties.changed = false;
    graph.properties.project = project.id;

    if (entry.local) {
      entry.local.startTransaction(sha);
      noflo.graph.mergeResolveTheirs(entry.local, graph);
      entry.local.endTransaction(sha);
      // Ensure the graph is marked as not changed since SHA
      entry.local.properties.changed = false;
      collections.addToList(project.graphs, entry.local);
      callback(null, entry.local);
      return;
    }

    graph.properties.name = entry.remote.name;
    graph.name = entry.remote.name;
    graph.properties.id = uuid.v4();
    if (!graph.properties.environment) { graph.properties.environment = {}; }
    if (!graph.properties.environment.type) { graph.properties.environment.type = project.type; }
    collections.addToList(project.graphs, graph);
    callback(null, graph);
    return callback();
  });
};

const handleComponent = function(sha, content, entry, project, callback) {
  if (entry.local) {
    entry.local.code = content;
    entry.local.sha = sha;
    entry.local.changed = false;
    collections.addToList(project.components, entry.local);
    callback(null, entry.local);
    return;
  }
  const newEntry = {
    id: uuid.v4(),
    project: project.id,
    name: entry.remote.name,
    code: content,
    language: entry.remote.language,
    sha,
    changed: false
  };
  collections.addToList(project.components, newEntry);
  return callback(null, newEntry);
};

const handleSpec = function(sha, content, entry, project, callback) {
  if (entry.local) {
    entry.local.code = content;
    entry.local.sha = sha;
    entry.local.changed = false;
    collections.addToList(project.specs, entry.local);
    callback(null, entry.local);
    return;
  }
  const newEntry = {
    id: uuid.v4(),
    project: project.id,
    type: 'spec',
    name: entry.remote.name,
    code: content,
    language: entry.remote.language,
    sha,
    changed: false
  };
  collections.addToList(project.specs, newEntry);
  return callback(null, newEntry);
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('blob', {
    datatype: 'array',
    description: 'Git blob entries'
  }
  );
  c.inPorts.add('operation', {
    datatype: 'object',
    description: 'Sync operation',
    required: true
  }
  );
  c.outPorts.add('graph', {
    datatype: 'object',
    scoped: false
  }
  );
  c.outPorts.add('component', {
    datatype: 'object',
    scoped: false
  }
  );
  c.outPorts.add('spec', {
    datatype: 'object',
    scoped: false
  }
  );
  c.outPorts.add('project', {
    datatype: 'object',
    scoped: false
  }
  );
  c.outPorts.add('error', {
    datatype: 'object',
    scoped: false
  }
  );

  c.forwardBrackets = {};
  return c.process(function(input, output) {
    if (!input.hasData('operation')) { return; }
    if (!input.hasData('blob')) { return; }
    const [operation, blobs] = Array.from(input.getData('operation', 'blob'));

    if (!(operation.pull != null ? operation.pull.length : undefined)) {
      output.done(new Error('Operation does not provide any pull entries'));
      return;
    }

    const entities = [];
    const errors = [];
    blobs.forEach(function(data) {
      const { sha } = data;
      let content = data.content.replace(/\s/g, '');
      if (data.encoding === 'base64') { content = decodeURIComponent(escape(atob(content))); }

      for (let entry of Array.from(operation.pull)) {
        var method, port;
        if ((entry.remote != null ? entry.remote.sha : undefined) !== sha) { continue; }
        switch (entry.type) {
          case 'graph':
            method = handleGraph;
            port = 'graph';
            break;
          case 'spec':
            method = handleSpec;
            port = 'spec';
            break;
          default:
            method = handleComponent;
            port = 'component';
        }
        method(sha, content, entry, operation.project, function(err, entity) {
          if (err) {
            errors.push(err);
            return;
          }
          return entities.push({
            type: port,
            entity
          });
        });
        return;
      }
      errors.push(`No entry found for blob ${sha}`);
    });
    if (errors.length) {
      output.done(errors[0]);
      return;
    }
    for (let entity of Array.from(entities)) {
      const res = {};
      res[entity.type] = entity.entity;
      output.send(res);
    }

    // Since this is a new checkout, set project main graph
    operation.project.main = projects.findMainGraph(operation.project);

    return output.sendDone({
      project: operation.project});
  });
};
