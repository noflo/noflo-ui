const qs = require('querystring');
const noflo = require('noflo');

const exchangeToken = function(code, params, callback) {
  const req = new XMLHttpRequest;
  req.onreadystatechange = function() {
    let data, e, token_found;
    if (req.readyState !== 4) { return; }
    if (req.status !== 200) {
      try {
        data = JSON.parse(req.responseText);
        callback(new Error(`Authentication token exchange failed with ${data.error}`));
      } catch (error) {
        e = error;
        callback(new Error(req.responseText));
      }
      return;
    }
    try {
      data = JSON.parse(req.responseText);
      token_found = data.token || data.access_token || null;
    } catch (error1) {
      e = error1;
      return callback(e);
    }
    callback(null, token_found);
  };

  if (params.clientsecret) {
    // We know the client secret. Get token directly from provider
    const payload = {
      code,
      client_id: params.clientid,
      client_secret: params.clientsecret,
      grant_type: 'authorization_code',
      redirect_uri: params.redirect || window.location.href
    };
    req.open('POST', `${params.token_server}${params.token_endpoint}`, true);
    req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    req.setRequestHeader("Accept", "application/json");
    req.send(qs.stringify(payload));
    return;
  }
  // Normal scenario: exchange token via Gatekeeper
  req.open('GET', `${params.gatekeeper_server}${params.gatekeeper_endpoint}/${code}`, true);
  return req.send(null);
};

exports.getComponent = function() {
  const c = new noflo.Component;
  c.inPorts.add('code',
    {datatype: 'string'});
  c.outPorts.add('token',
    {datatype: 'string'});
  c.outPorts.add('error',
    {datatype: 'object'});

  return noflo.helpers.WirePattern(c, {
    in: 'code',
    out: 'token',
    async: true
  }
  , function(data, groups, out, callback) {
    // Configuration, built-in
    const params = {
      redirect: '$NOFLO_OAUTH_CLIENT_REDIRECT',
      clientid: '$NOFLO_OAUTH_CLIENT_ID',
      clientsecret: '$NOFLO_OAUTH_CLIENT_SECRET',
      token_server: '$NOFLO_OAUTH_PROVIDER',
      token_endpoint: '$NOFLO_OAUTH_ENDPOINT_TOKEN',
      gatekeeper_server: '$NOFLO_OAUTH_GATE',
      gatekeeper_endpoint: '$NOFLO_OAUTH_ENDPOINT_AUTHENTICATE'
    };

    if ((window.location.protocol === 'https:') && '$NOFLO_OAUTH_SSL_CLIENT_ID') {
      params.redirect = '$NOFLO_OAUTH_SSL_CLIENT_REDIRECT';
      params.clientid = '$NOFLO_OAUTH_SSL_CLIENT_ID';
      params.clientsecret = '$NOFLO_OAUTH_SSL_CLIENT_SECRET';
      params.gatekeeper_endpoint = '$NOFLO_OAUTH_SSL_ENDPOINT_AUTHENTICATE';
    }

    if ((typeof chrome !== 'undefined') && chrome.identity) {
      params.redirect = '$NOFLO_OAUTH_CHROME_CLIENT_REDIRECT';
      params.clientid = '$NOFLO_OAUTH_CHROME_CLIENT_ID';
      params.clientsecret = '$NOFLO_OAUTH_CHROME_CLIENT_SECRET';
      params.gatekeeper_endpoint = '$NOFLO_OAUTH_CHROME_ENDPOINT_AUTHENTICATE';
    }

    // TODO: "loading" action?

    // Perform token exchange
    return exchangeToken(data, params, function(err, token) {
      if (err) { return callback(err); }
      if (!token) {
        return callback(new Error('OAuth token exchange didn\'t return a token'));
      }
      out.send(token);
      return callback();
    });
  });
};
