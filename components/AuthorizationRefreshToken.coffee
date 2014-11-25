noflo = require 'noflo'

checkToken = (url, params, callback) ->
  req = new XMLHttpRequest
  req.onreadystatechange = ->
    return unless req.readyState is 4
    if req.status is 200
      try
        data = JSON.parse req.responseText
        token_found = if data.token? then data.token else data.access_token
      catch e
        return callback e
      unless token_found
        return callback null, null

      callback null, data
  # get token directly from provider
  if '$NOFLO_OAUTH_CLIENT_SECRET' isnt ''
    post_params = "client_id=#{params.clientid}&grant_type=refresh_token&client_secret=$NOFLO_OAUTH_CLIENT_SECRET&refresh_token=#{params.refreshtoken}"
    req.open 'POST', "#{params.site}$NOFLO_OAUTH_ENDPOINT_TOKEN", true
    # Set headers required for POST request
    req.setRequestHeader "Content-Type", "application/x-www-form-urlencoded"
    req.setRequestHeader "Content-length", post_params.length
    req.setRequestHeader "Connection", "close"
    # Send data 
    req.send post_params
  # get token from oauth2 gate
  if '$NOFLO_OAUTH_CLIENT_SECRET' is '' or null
    req.open 'GET', "#{params.gatekeeper}$NOFLO_OAUTH_ENDPOINT_AUTHENTICATE/#{code[1]}", true
    req.send null

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'refreshtoken',
    datatype: 'string'
    required: true
  c.inPorts.add 'check',
    datatype: 'bang'
  c.inPorts.add 'site',
    datatype: 'string'
    required: true
  c.inPorts.add 'clientid',
    datatype: 'string'
    required: true
  c.outPorts.add 'token',
    datatype: 'string'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'refreshtoken'
    params: [
      'site'
      'clientid'
    ]
    out: 'token'
    async: true
  , (refreshtoken, groups, out, callback) -> 
    c.params.refreshtoken = refreshtoken
    # With browser we check the URL also initially
    checkToken window.location.href, c.params, (err, token) ->
      return if err
      return unless token
      c.outPorts.token.send token
      c.outPorts.token.disconnect()

  c
