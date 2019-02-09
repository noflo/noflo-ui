const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('existing',
    { datatype: 'array' });
  c.outPorts.add('new',
    { datatype: 'object' });

  return noflo.helpers.WirePattern(c, {
    out: ['existing', 'new'],
    async: true,
  },
  (data, groups, out, callback) => {
    if (!data.state || !data.state.projects || !data.state.projects.length) {
      // No local projects, pass
      out.new.send(data);
      callback();
      return;
    }

    const existing = data.state.projects.filter(project => project.gist === data.payload.graph);
    if (!existing.length) {
      out.new.send(data);
      callback();
      return;
    }

    out.existing.send([
      'project',
      existing[0].id,
      existing[0].main,
    ]);
    callback();
  });
};
