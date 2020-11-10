const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('user', {
    datatype: 'object',
  });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });
  return c.process((input, output) => {
    if (!input.hasData('in', 'user')) { return; }
    const [data, user] = input.getData('in', 'user');
    if (!user || !user['flowhub-token']) {
      // User not logged in, public repos may work so pass
      output.sendDone({ out: data });
      return;
    }
    const req = new XMLHttpRequest();
    req.onreadystatechange = () => {
      if (req.readyState !== 4) {
        return;
      }
      if (![200, 201].includes(req.status)) {
        // Repository not available
        let { message } = JSON.parse(req.responseText);
        if (message.indexOf('"message":') !== -1) {
          // JSON inside JSON, nice
          ({ message } = JSON.parse(message));
        }
        output.done(new Error(message));
        return;
      }
      // Repository registered, let sync happen
      output.sendDone({ out: data });
    };
    const payload = JSON.stringify({
      repo: data.repo,
      active: true,
    });
    req.open('POST', `${process.env.NOFLO_REGISTRY_SERVICE}/projects`, true);
    req.setRequestHeader('Authorization', `Bearer ${user['flowhub-token']}`);
    req.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    req.send(payload);
  });
};
