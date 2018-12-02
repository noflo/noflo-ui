const noflo = require('noflo');
const octo = require('octo');

const githubGet = (url, token, callback) => {
  const api = octo.api();
  api.token(token);
  const request = api.get(url);
  request.on('success', (res) => {
    if (!res.body) {
      callback(new Error('No result received'));
      return;
    }
    callback(null, res.body);
  });
  request.on('error', err => callback(err.body));
  request();
};

const getTree = (repo, tree, token, callback) => githubGet(`/repos/${repo}/git/trees/${tree}`, token, callback);

const getCommit = (repo, sha, token, callback) => githubGet(`/repos/${repo}/git/commits/${sha}`, token, callback);

const processGraphsTree = (tree, o, prefix) => {
  const objects = o;
  if (!tree) { return; }
  let graphs = tree.tree.filter((entry) => {
    if (entry.type !== 'blob') { return false; }
    if (!entry.path.match('.*.(fbp|json)$')) { return false; }
    return true;
  });
  graphs = graphs.filter((entry) => {
    // If we have .json and .fbp for same graph, .json wins
    if (entry.path.indexOf('.fbp') === -1) { return true; }
    const jsonVersion = entry.path.replace('.fbp', '.json');
    const jsonFound = graphs.find(g => g.path === jsonVersion);
    if (jsonFound) {
      return false;
    }
    return true;
  });
  objects.graphs = objects.graphs.concat(graphs.map((e) => {
    const entry = e;
    entry.name = entry.path.substr(0, entry.path.indexOf('.'));
    entry.language = entry.path.substr(entry.path.lastIndexOf('.') + 1);
    entry.fullPath = `${prefix}${entry.path}`;
    return entry;
  }));
};

const processComponentsTree = (tree, o, prefix) => {
  const objects = o;
  if (!tree) { return; }
  const components = tree.tree.filter((entry) => {
    if (entry.type !== 'blob') { return false; }
    if (!entry.path.match('.*.(coffee|js|hpp|c|py)$')) { return false; }
    return true;
  });
  objects.components = objects.components.concat(components.map((e) => {
    const entry = e;
    entry.name = entry.path.substr(0, entry.path.indexOf('.'));
    const language = entry.path.substr(entry.path.lastIndexOf('.') + 1);
    switch (language) {
      case 'coffee': entry.language = 'coffeescript'; break;
      case 'js': entry.language = 'javascript'; break;
      case 'hpp': entry.language = 'c++'; break;
      case 'c': entry.language = 'c'; break;
      case 'py': entry.language = 'python'; break;
      default: entry.language = language;
    }
    entry.fullPath = `${prefix}${entry.path}`;
    return entry;
  }));
};

const processSpecsTree = (tree, o, prefix) => {
  const objects = o;
  if (!tree) { return; }
  const specs = tree.tree.filter((entry) => {
    if (entry.type !== 'blob') { return false; }
    if (!entry.path.match('.*.(yaml|coffee)$')) { return false; }
    return true;
  });
  objects.specs = objects.specs.concat(specs.map((e) => {
    const entry = e;
    entry.name = entry.path.substr(0, entry.path.indexOf('.'));
    entry.type = 'spec';
    const language = entry.path.substr(entry.path.lastIndexOf('.') + 1);
    switch (language) {
      case 'coffee': entry.language = 'coffeescript'; break;
      default: entry.language = language;
    }
    entry.fullPath = `${prefix}${entry.path}`;
    return entry;
  }));
};

const getRemoteObjects = (repo, sha, token, callback) => getCommit(
  repo,
  sha,
  token,
  (e, commit) => {
    if (e) {
      callback(e);
      return;
    }
    if (!commit) {
      callback(new Error(`No commit found for ${repo} ${sha}`));
      return;
    }
    getTree(repo, commit.tree.sha, token, (error, rootTree) => {
      if (error) {
        callback(error);
        return;
      }

      let graphsSha = null;
      let componentsSha = null;
      let specsSha = null;
      const remoteObjects = {
        tree: commit.tree.sha,
        graphs: [],
        components: [],
        specs: [],
      };
      rootTree.tree.forEach((entry) => {
        if ((entry.path === 'fbp.json') && (entry.type === 'blob')) {
          return;
        }
        if ((entry.path === 'graphs') && (entry.type === 'tree')) {
          graphsSha = entry.sha;
          return;
        }
        if ((entry.path === 'components') && (entry.type === 'tree')) {
          componentsSha = entry.sha;
          return;
        }
        if ((entry.path === 'spec') && (entry.type === 'tree')) {
          specsSha = entry.sha;
        }
      });

      if (graphsSha) {
        getTree(repo, graphsSha, token, (graphErr, graphsTree) => {
          if (graphErr) {
            callback(graphErr);
            return;
          }
          processGraphsTree(graphsTree, remoteObjects, 'graphs/');
          if (!componentsSha) {
            callback(null, remoteObjects);
            return;
          }
          getTree(repo, componentsSha, token, (componentsErr, componentsTree) => {
            if (componentsErr) {
              callback(componentsErr);
              return;
            }
            processComponentsTree(componentsTree, remoteObjects, 'components/');
            if (!specsSha) {
              callback(null, remoteObjects);
              return;
            }
            getTree(repo, specsSha, token, (specsErr, specsTree) => {
              if (specsErr) {
                callback(specsErr);
                return;
              }
              processSpecsTree(specsTree, remoteObjects, 'spec/');
              callback(null, remoteObjects);
            });
          });
        });
        return;
      }

      if (componentsSha) {
        getTree(repo, componentsSha, token, (componentsErr, componentsTree) => {
          if (componentsErr) {
            callback(componentsErr);
            return;
          }
          processComponentsTree(componentsTree, remoteObjects, 'components/');
          if (!specsSha) {
            callback(null, remoteObjects);
            return;
          }
          getTree(repo, specsSha, token, (specsErr, specsTree) => {
            if (specsErr) {
              callback(specsErr);
              return;
            }
            processSpecsTree(specsTree, remoteObjects, 'spec/');
            callback(null, remoteObjects);
          });
        });
        return;
      }

      if (specsSha) {
        getTree(repo, specsSha, token, (err, specsTree) => {
          if (err) { return callback(err); }
          processSpecsTree(specsTree, remoteObjects, 'spec/');
          return callback(null, remoteObjects);
        });
        return;
      }

      // No graphs or components on the remote
      callback(null, remoteObjects);
    });
  },
);

const normalizeName = name => name.replace(/\s/g, '_');

const createPath = (type, entity) => {
  const name = normalizeName(entity.name);
  if (type === 'graph') {
    return `graphs/${name}.json`;
  }
  let componentDir = 'components';
  if (type === 'spec') { componentDir = 'spec'; }
  switch (entity.language) {
    case 'coffeescript': return `${componentDir}/${name}.coffee`;
    case 'javascript': return `${componentDir}/${name}.js`;
    case 'es2015': return `${componentDir}/${name}.js`;
    case 'c++': return `${componentDir}/${name}.hpp`;
    case 'python': return `${componentDir}/${name}.py`;
    default: return `${componentDir}/${name}.${entity.language}`;
  }
};

const addToPull = (type, local, remote, operations) => operations.pull.push({
  path: remote.fullPath,
  type,
  local,
  remote,
});
const addToPush = (type, local, remote, operations) => operations.push.push({
  path: (remote != null ? remote.fullPath : undefined) || createPath(type, local),
  type,
  local,
  remote,
});
const addToConflict = (type, local, remote, operations) => operations.conflict.push({
  path: remote.fullPath,
  type,
  local,
  remote,
});

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('reference',
    { datatype: 'object' });
  c.inPorts.add('project',
    { datatype: 'object' });
  c.inPorts.add('token', {
    datatype: 'string',
    required: true,
  });
  c.outPorts.add('noop',
    { datatype: 'object' });
  c.outPorts.add('local',
    { datatype: 'object' });
  c.outPorts.add('remote',
    { datatype: 'object' });
  c.outPorts.add('both',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  noflo.helpers.WirePattern(c, {
    in: ['reference', 'project'],
    params: 'token',
    out: ['noop', 'local', 'remote', 'both'],
    async: true,
  },
  (data, groups, out, callback) => {
    const operations = {
      repo: data.project.repo,
      project: data.project,
      ref: data.reference.ref,
      commit: data.reference.object.sha,
      push: [],
      pull: [],
      conflict: [],
    };

    getRemoteObjects(operations.repo, operations.commit, c.params.token, (err, objects) => {
      if (err) {
        callback(err);
        return;
      }
      operations.tree = objects.tree;

      objects.graphs.forEach((remoteGraph) => {
        const matching = data.project.graphs.filter((localGraph) => {
          if (localGraph.properties.sha === remoteGraph.sha) { return true; }
          if (normalizeName(localGraph.name) === remoteGraph.name) { return true; }
          return false;
        });
        if (!matching.length) {
          // No local version, add to pull
          addToPull('graph', null, remoteGraph, operations);
          return;
        }
        if (matching[0].properties.sha === remoteGraph.sha) {
          // Updated local version
          if (matching[0].properties.changed) { addToPush('graph', matching[0], remoteGraph, operations); }
          return;
        }
        if (matching[0].properties.changed === false) {
          addToPull('graph', matching[0], remoteGraph, operations);
          return;
        }
        addToConflict('graph', matching[0], remoteGraph, operations);
      });

      let localOnly = data.project.graphs.filter((localGraph) => {
        let notPushed = true;
        objects.graphs.forEach((remoteGraph) => {
          if (localGraph.properties.sha === remoteGraph.sha) { notPushed = false; }
          if (normalizeName(localGraph.name) === remoteGraph.name) { notPushed = false; }
        });
        return notPushed;
      });
      localOnly.forEach((localGraph) => {
        addToPush('graph', localGraph, null, operations);
      });

      objects.components.forEach((remoteComponent) => {
        const matching = data.project.components.filter((localComponent) => {
          if (localComponent.sha === remoteComponent.sha) { return true; }
          if (normalizeName(localComponent.name) === remoteComponent.name) { return true; }
          return false;
        });
        if (!matching.length) {
          // No local version, add to pull
          addToPull('component', null, remoteComponent, operations);
          return;
        }
        if (matching[0].sha === remoteComponent.sha) {
          // Updated local version
          if (matching[0].changed) { addToPush('component', matching[0], remoteComponent, operations); }
          return;
        }
        if (matching[0].changed === false) {
          addToPull('component', matching[0], remoteComponent, operations);
          return;
        }
        addToConflict('component', matching[0], remoteComponent, operations);
      });

      localOnly = data.project.components.filter((localComponent) => {
        if (!localComponent.code.length) { return false; }
        let notPushed = true;
        objects.components.forEach((remoteComponent) => {
          if (localComponent.sha === remoteComponent.sha) { notPushed = false; }
          if (normalizeName(localComponent.name) === remoteComponent.name) { notPushed = false; }
        });
        return notPushed;
      });
      localOnly.forEach((localComponent) => {
        addToPush('component', localComponent, null, operations);
      });

      objects.specs.forEach((remoteSpec) => {
        const matching = data.project.specs.filter((localSpec) => {
          if (localSpec.sha === remoteSpec.sha) { return true; }
          if (normalizeName(localSpec.name) === remoteSpec.name) { return true; }
          return false;
        });
        if (!matching.length) {
          // No local version, add to pull
          addToPull('spec', null, remoteSpec, operations);
          return;
        }
        if (matching[0].sha === remoteSpec.sha) {
          // Updated local version
          if (matching[0].changed) { addToPush('spec', matching[0], remoteSpec, operations); }
          return;
        }
        if (matching[0].changed === false) {
          addToPull('spec', matching[0], remoteSpec, operations);
          return;
        }
        addToConflict('spec', matching[0], remoteSpec, operations);
      });

      localOnly = data.project.specs.filter((localSpec) => {
        if (!localSpec.code.length) { return false; }
        let notPushed = true;
        objects.specs.forEach((remoteSpec) => {
          if (localSpec.sha === remoteSpec.sha) { notPushed = false; }
          if (normalizeName(localSpec.name) === remoteSpec.name) { notPushed = false; }
        });
        return notPushed;
      });
      localOnly.forEach((localSpec) => {
        addToPush('spec', localSpec, null, operations);
      });

      if (operations.conflict.length) {
        out.both.send(operations);
        callback();
        return;
      }

      if (operations.push.length && operations.pull.length) {
        out.both.send(operations);
        callback();
        return;
      }

      if (operations.push.length) {
        out.local.send(operations);
        callback();
        return;
      }

      if (operations.pull.length) {
        out.remote.send(operations);
        callback();
        return;
      }

      out.noop.send(operations);
      callback();
    });
  });

  return c;
};
