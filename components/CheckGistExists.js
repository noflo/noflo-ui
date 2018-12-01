const noflo = require('noflo');

exports.getComponent = function () {
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
    if (!__guard__(data.state != null ? data.state.projects : undefined, x => x.length)) {
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
    return callback();
  });
};

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
