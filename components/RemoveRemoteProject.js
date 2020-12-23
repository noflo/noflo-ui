const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.inPorts.add('user', {
    datatype: 'object',
    required: true,
    control: true,
  });
  c.outPorts.add('out',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    if (!input.hasData('in', 'user')) {
      return;
    }
    const [data, user] = input.getData('in', 'user');
    if (!user || !user['flowhub-token']) {
      // User not logged in, persist runtime only locally
      output.sendDone({
        out: data,
      });
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
        output.done(new Error(message));
        return;
      }
      // Repository registered, let sync happen
      output.sendDone({
        out: data,
      });
    };
    req.open('DELETE', `${process.env.NOFLO_REGISTRY_SERVICE}/projects/${data.id}`, true);
    req.setRequestHeader('Authorization', `Bearer ${user['flowhub-token']}`);
    req.send();
  });
};
