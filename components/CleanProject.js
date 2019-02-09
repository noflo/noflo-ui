const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('out',
    { datatype: 'object' });
  return noflo.helpers.WirePattern(c, {
    async: true,
    forwardGroups: false,
  },
  (data, groups, out, callback) => {
    out.send({
      id: data.id,
      name: data.name,
      namespace: data.namespace,
      type: data.type,
      repo: data.repo,
      branch: data.branch,
      gist: data.gist,
      main: data.main,
    });
    callback();
  });
};
