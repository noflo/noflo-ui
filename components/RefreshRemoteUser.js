const noflo = require('noflo');

exports.getComponent = () => {
  const c = new noflo.Component();
  c.inPorts.add('in',
    { datatype: 'object' });
  c.outPorts.add('pass',
    { datatype: 'object' });
  c.outPorts.add('updated',
    { datatype: 'object' });
  c.outPorts.add('invalid',
    { datatype: 'object' });
  c.outPorts.add('error',
    { datatype: 'object' });
  return c.process((input, output) => {
    const data = input.getData('in');
    if (!data || !data['flowhub-token']) {
      // If user is not logged in, there is nothing to do
      output.sendDone({
        pass: data,
      });
      return;
    }

    if (!navigator.onLine) {
      // When offline we can't refresh
      output.sendDone({
        pass: data,
      });
      return;
    }

    // Try refreshing user information
    const req = new XMLHttpRequest();
    req.onreadystatechange = () => {
      let userData;
      if (req.readyState !== 4) { return; }
      if (req.status === 401) {
        // We have invalid token, clear local user data
        output.sendDone({
          invalid: data,
        });
        return;
      }
      if (req.status !== 200) {
        try {
          const resData = JSON.parse(req.responseText);
          output.done(new Error(resData.message || `User fetching failed with ${req.status}`));
        } catch (error) {
          output.done(new Error(req.responseText));
        }
        return;
      }
      try {
        userData = JSON.parse(req.responseText);
      } catch (error) {
        output.done(error);
        return;
      }
      if (JSON.stringify(userData) === JSON.stringify(data['flowhub-user'])) {
        // Local user data is up-to-date
        output.sendDone({
          pass: data,
        });
        return;
      }
      // Update user information based on remote data
      output.sendDone({
        updated: userData,
      });
    };
    req.open('GET', `${process.env.NOFLO_OAUTH_SERVICE_USER}${process.env.NOFLO_OAUTH_ENDPOINT_USER}`, true);
    req.setRequestHeader('Authorization', `Bearer ${data['flowhub-token']}`);
    req.send(null);
  });
};
