const noflo = require('noflo');

const prepareContent = (type, local) => {
  if (['component', 'spec'].includes(type)) { return local.code; }
  const def = local.toJSON();
  delete def.properties.sha;
  delete def.properties.id;
  delete def.properties.project;
  delete def.properties.changed;
  return JSON.stringify(def, null, 4);
};

const preparePath = (type, path) => {
  if (type !== 'graph') { return path; }
  // We can't generate .fbp, so always push .json
  return path.replace('.fbp', '.json');
};

const buildTree = entries => entries.map(entry => ({
  path: preparePath(entry.type, entry.path),
  content: prepareContent(entry.type, entry.local),
  mode: '100644',
}));

exports.getComponent = () => {
  const c = new noflo.Component();
  c.description = 'Prepare a GitHub tree for an operations object';
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('repository',
    { datatype: 'string' });
  c.outPorts.add('tree',
    { datatype: 'array' });
  c.outPorts.add('basetree',
    { datatype: 'string' });
  c.outPorts.add('parentcommits',
    { datatype: 'array' });
  c.outPorts.add('message',
    { datatype: 'string' });
  c.outPorts.add('ref',
    { datatype: 'string' });

  return noflo.helpers.WirePattern(c, {
    in: 'in',
    out: ['out', 'repository', 'tree', 'basetree', 'parentcommits', 'message', 'ref'],
    async: true,
  },
  (data, groups, out, callback) => {
    if (!(data.push != null ? data.push.length : undefined)) { return callback(); }

    out.out.send(data);
    out.basetree.send(data.tree);
    out.tree.send(buildTree(data.push));
    out.repository.send(data.repo);
    out.parentcommits.send([data.commit]);
    out.message.send(data.message);
    out.ref.send(data.ref);
    return callback();
  });
};
