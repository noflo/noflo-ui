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

  return noflo.helpers.WirePattern(c, {
    in: 'in',
    out: ['pass', 'updated', 'invalid'],
    async: true,
  },
  (data, groups, out, callback) => {
    if (!data || !data['flowhub-token']) {
      // If user is not logged in, there is nothing to do
      out.pass.send(data);
      callback();
      return;
    }

    if (!navigator.onLine) {
      // When offline we can't refresh
      out.pass.send(data);
      callback();
      return;
    }

    // Try refreshing user information
    const req = new XMLHttpRequest();
    req.onreadystatechange = () => {
      let userData;
      if (req.readyState !== 4) { return; }
      if (req.status === 401) {
        // We have invalid token, clear local user data
        out.invalid.send(data);
        callback();
        return;
      }
      if (req.status !== 200) {
        try {
          const resData = JSON.parse(req.responseText);
          callback(new Error(resData.message || `User fetching failed with ${req.status}`));
        } catch (error) {
          callback(new Error(req.responseText));
        }
        return;
      }
      try {
        userData = JSON.parse(req.responseText);
      } catch (error) {
        callback(error);
        return;
      }
      if (JSON.stringify(userData) === JSON.stringify(data['flowhub-user'])) {
        // Local user data is up-to-date
        out.pass.send(data);
        callback();
        return;
      }
      // Update user information based on remote data
      out.updated.send(userData);
      callback();
    };
    req.open('GET', '$NOFLO_OAUTH_SERVICE_USER$NOFLO_OAUTH_ENDPOINT_USER', true);
    req.setRequestHeader('Authorization', `Bearer ${data['flowhub-token']}`);
    req.send(null);
  });
};
