const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('token', {
    datatype: 'string',
    required: true,
  });
  c.outPorts.add('user',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });

  return c.process((input, output) => {
    const token = input.getData('token');
    const req = new XMLHttpRequest();
    req.onreadystatechange = () => {
      if (req.readyState !== 4) { return; }
      if (req.status !== 200) {
        try {
          const data = JSON.parse(req.responseText);
          output.done(new Error(data.message || `User fetching failed with ${req.status}`));
        } catch (err) {
          output.done(new Error(req.responseText));
        }
        return;
      }
      let userData;
      try {
        userData = JSON.parse(req.responseText);
      } catch (e) {
        output.done(e);
        return;
      }
      output.sendDone({
        user: userData,
      });
    };
    req.open('GET', `${process.env.NOFLO_OAUTH_SERVICE_USER}${process.env.NOFLO_OAUTH_ENDPOINT_USER}`, true);
    req.setRequestHeader('Authorization', `Bearer ${token}`);
    req.send(null);
  });
};
