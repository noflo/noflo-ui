const noflo = require('noflo');

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('token', {
    datatype: 'string',
    required: true
  }
  );
  c.outPorts.add('user',
    {datatype: 'object'});
  c.outPorts.add('error',
    {datatype: 'object'});

  return noflo.helpers.WirePattern(c, {
    in: 'token',
    out: 'user',
    async: true
  }
  , function(token, groups, out, callback) {
    const req = new XMLHttpRequest;
    req.onreadystatechange = function() {
      let e, userData;
      if (req.readyState !== 4) { return; }
      if (req.status !== 200) {
        try {
          const data = JSON.parse(req.responseText);
          callback(new Error(data.message || `User fetching failed with ${req.status}`));
        } catch (error) {
          e = error;
          callback(new Error(req.responseText));
        }
        return;
      }
      try {
        userData = JSON.parse(req.responseText);
      } catch (error1) {
        e = error1;
        return callback(e);
      }
      out.send(userData);
      callback();
    };
    req.open('GET', "$NOFLO_OAUTH_SERVICE_USER$NOFLO_OAUTH_ENDPOINT_USER", true);
    req.setRequestHeader('Authorization', `Bearer ${token}`);
    return req.send(null);
  });
};
