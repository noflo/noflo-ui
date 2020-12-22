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

const buildTree = (entries) => entries.map((entry) => ({
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

  return c.process((input, output) => {
    const data = input.getData('in');
    if (!(data.push != null ? data.push.length : undefined)) {
      output.done();
      return;
    }
    output.sendDone({
      out: data,
      basetree: data.tree,
      tree: buildTree(data.push),
      repository: data.repo,
      parentcommits: [data.commit],
      message: data.message,
      ref: data.ref,
    });
  });
};
