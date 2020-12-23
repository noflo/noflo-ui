const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('user',
    { datatype: 'object' });
  c.outPorts.add('projects',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    const user = input.getData('user');
    if (!user['flowhub-token']) {
      output.done();
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
          output.done(e);
          return;
        }
        output.sendDone({
          projects,
        });
        return;
      }
      output.done(new Error(req.responseText));
    };
    req.open('GET', `${process.env.NOFLO_REGISTRY_SERVICE}/projects`, true);
    req.setRequestHeader('Authorization', `Bearer ${user['flowhub-token']}`);
    req.send(null);
  });
};
