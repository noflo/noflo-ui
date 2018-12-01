const noflo = require('noflo');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('user',
    {datatype: 'object'});
  c.outPorts.add('projects',
    {datatype: 'object'});
  c.outPorts.add('error',
    {datatype: 'object'});

  return noflo.helpers.WirePattern(c, {
    in: 'user',
    out: 'projects',
    async: true
  }
  , function(user, groups, out, callback) {
    if (!user['flowhub-token']) { return callback(); }
    const req = new XMLHttpRequest;
    req.onreadystatechange = function() {
      if (req.readyState !== 4) { return; }
      if (req.status === 200) {
        let projects;
        try {
          projects = JSON.parse(req.responseText);
        } catch (e) {
          return callback(e);
        }
        out.send(projects);
        callback();
        return;
      }
      return callback(new Error(req.responseText));
    };
    req.open('GET', '$NOFLO_REGISTRY_SERVICE/projects', true);
    req.setRequestHeader('Authorization', `Bearer ${user['flowhub-token']}`);
    return req.send(null);
  });
};
