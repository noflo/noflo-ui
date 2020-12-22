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
  request.on('error', (err) => callback(err.body));
  return request();
};

const getTree = (repo, tree, token, callback) => githubGet(`/repos/${repo}/git/trees/${tree}`, token, callback);

const processTree = (basePath, tree, entries, repo, token, output) => {
  const subTrees = [];
  const handled = [];
  tree.tree.forEach((treeEntry) => {
    const entry = treeEntry;
    entry.fullPath = `${basePath}${entry.path}`;
    if (entry.type === 'tree') {
      subTrees.push(entry);
      return;
    }

    entries.forEach((e) => {
      const localEntry = e;
      if (entry.fullPath !== localEntry.path) {
        if (entry.fullPath !== localEntry.path.replace('.fbp', '.json')) { return; }
      }
      if (localEntry.type === 'graph') {
        localEntry.local.properties.sha = entry.sha;
        localEntry.local.properties.changed = false;
        handled.push(localEntry);
        output.send({
          graph: localEntry.local,
        });
        return;
      }
      localEntry.local.sha = entry.sha;
      localEntry.local.changed = false;
      handled.push(localEntry);
      if (localEntry.type === 'spec') {
        output.send({
          spec: localEntry.local,
        });
        return;
      }
      output.send({
        component: localEntry.local,
      });
    });
  });

  handled.forEach((found) => {
    entries.splice(entries.indexOf(found), 1);
  });

  if (entries.length === 0) {
    output.done();
    return;
  }

  subTrees.forEach((subTree) => getTree(repo, subTree.sha, token, (err, sTree) => {
    if (err) {
      output.done(err);
      return;
    }
    processTree(`${subTree.fullPath}/`, sTree, entries, repo, token, output);
  }));
};

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('tree',
    { datatype: 'object' });
  c.inPorts.add('repository',
    { datatype: 'string' });
  c.inPorts.add('token', {
    datatype: 'string',
    description: 'GitHub API token',
    required: true,
    control: true,
  });
  c.outPorts.add('graph',
    { datatype: 'object' });
  c.outPorts.add('component',
    { datatype: 'object' });
  c.outPorts.add('spec',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('in', 'tree', 'repository', 'token')) {
      return;
    }
    const [operation, tree, repository, token] = input.getData('in', 'tree', 'repository', 'token');
    if (!tree.tree) {
      output.done();
      return;
    }
    if (!(operation.push != null ? operation.push.length : undefined)) {
      output.done();
      return;
    }
    processTree('', tree, operation.push, repository, token, output);
  });
};
