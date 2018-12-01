const noflo = require('noflo');
const projects = require('../src/projects');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('project',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('hash',
    { datatype: 'array' });
  return noflo.helpers.WirePattern(c, {
    in: ['in', 'project'],
    out: ['out', 'hash'],
    async: true,
    forwardGroups: false,
  },
  (data, groups, out, callback) => {
    out.out.send(data.project);

    if (data.in.state.project) {
      // We're already in project view, no need to open
      callback();
      return;
    }

    // Generate hash to open newly-created project
    projects.getProjectHash(data.project, (err, hash) => {
      if (err) { return callback(); }
      out.hash.send(hash);
      return callback();
    });
  });
};
