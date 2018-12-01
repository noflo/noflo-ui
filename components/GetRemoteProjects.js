const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('user',
    { datatype: 'object' });
  c.outPorts.add('projects',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return noflo.helpers.WirePattern(c, {
    in: 'user',
    out: 'projects',
    async: true,
  },
  (user, groups, out, callback) => {
    if (!user['flowhub-token']) {
      callback();
      return;
    }
    const req = new XMLHttpRequest();
    req.onreadystatechange = () => {
      if (req.readyState !== 4) { return; }
      if (req.status === 200) {
        let projects;
        try {
          projects = JSON.parse(req.responseText);
        } catch (e) {
          callback(e);
          return;
        }
        out.send(projects);
        callback();
        return;
      }
      callback(new Error(req.responseText));
    };
    req.open('GET', '$NOFLO_REGISTRY_SERVICE/projects', true);
    req.setRequestHeader('Authorization', `Bearer ${user['flowhub-token']}`);
    req.send(null);
  });
};
