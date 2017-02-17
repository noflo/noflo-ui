qs = require 'querystring'
noflo = require 'noflo'

exchangeToken = (code, params, callback) ->
  req = new XMLHttpRequest
  req.onreadystatechange = ->
    return unless req.readyState is 4
    unless req.status is 200
      try
        data = JSON.parse req.responseText
        callback new Error "Authentication token exchange failed with #{data.error}"
      catch e
        callback new Error req.responseText
      return
    try
      data = JSON.parse req.responseText
      token_found = data.token or data.access_token or null
    catch e
      return callback e
    callback null, token_found
    return

  if params.clientsecret
    # We know the client secret. Get token directly from provider
    payload =
      code: code
      client_id: params.clientid
      client_secret: params.clientsecret
      grant_type: 'authorization_code'
      redirect_uri: params.redirect or window.location.href
    req.open 'POST', "#{params.token_server}#{params.token_endpoint}", true
    req.setRequestHeader "Content-Type", "application/x-www-form-urlencoded"
    req.setRequestHeader "Accept", "application/json"
    req.send qs.stringify payload
    return
  # Normal scenario: exchange token via Gatekeeper
  req.open 'GET', "#{params.gatekeeper_server}#{params.gatekeeper_endpoint}/#{code}", true
  req.send null

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'code',
    datatype: 'string'
  c.outPorts.add 'token',
    datatype: 'string'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'code'
    out: 'token'
    async: true
  , (data, groups, out, callback) ->
    # Configuration, built-in
    params =
      redirect: '$NOFLO_OAUTH_CLIENT_REDIRECT'
      clientid: '$NOFLO_OAUTH_CLIENT_ID'
      clientsecret: '$NOFLO_OAUTH_CLIENT_SECRET'
      token_server: '$NOFLO_OAUTH_PROVIDER'
      token_endpoint: '$NOFLO_OAUTH_ENDPOINT_TOKEN'
      gatekeeper_server: '$NOFLO_OAUTH_GATE'
      gatekeeper_endpoint: '$NOFLO_OAUTH_ENDPOINT_AUTHENTICATE'

    if window.location.protocol is 'https:' and '$NOFLO_OAUTH_SSL_CLIENT_ID'
      params.redirect = '$NOFLO_OAUTH_SSL_CLIENT_REDIRECT'
      params.clientid = '$NOFLO_OAUTH_SSL_CLIENT_ID'
      params.clientsecret = '$NOFLO_OAUTH_SSL_CLIENT_SECRET'
      params.gatekeeper_endpoint = '$NOFLO_OAUTH_SSL_ENDPOINT_AUTHENTICATE'

    if typeof chrome isnt 'undefined' and chrome.identity
      params.redirect = '$NOFLO_OAUTH_CHROME_CLIENT_REDIRECT'
      params.clientid = '$NOFLO_OAUTH_CHROME_CLIENT_ID'
      params.clientsecret = '$NOFLO_OAUTH_CHROME_CLIENT_SECRET'
      params.gatekeeper_endpoint = '$NOFLO_OAUTH_CHROME_ENDPOINT_AUTHENTICATE'

    # TODO: "loading" action?

    # Perform token exchange
    exchangeToken data, params, (err, token) ->
      return callback err if err
      unless token
        return callback new Error 'OAuth token exchange didn\'t return a token'
      out.send token
      do callback
