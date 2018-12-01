const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('user', {
    datatype: 'object',
    required: true,
  });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return noflo.helpers.WirePattern(c, {
    in: 'in',
    params: 'user',
    out: 'out',
    async: true,
  },
  (data, groups, out, callback) => {
    if (!c.params || !c.params.user || !c.params.user['flowhub-token']) {
      // User not logged in, persist runtime only locally
      out.send(data);
      callback();
      return;
    }
    const req = new XMLHttpRequest();
    req.onreadystatechange = () => {
      if (req.readyState !== 4) { return; }
      if (![200, 201, 404].includes(req.status)) {
        // Repository not available
        let { message } = JSON.parse(req.responseText);
        if (message.indexOf('"message":') !== -1) {
          // JSON inside JSON, nice
          ({ message } = JSON.parse(message));
        }
        callback(new Error(message));
        return;
      }
      // Repository registered, let sync happen
      out.send(data);
    };
    req.open('DELETE', `$NOFLO_REGISTRY_SERVICE/projects/${data.id}`, true);
    req.setRequestHeader('Authorization', `Bearer ${c.params.user['flowhub-token']}`);
    req.send();
  });
};
