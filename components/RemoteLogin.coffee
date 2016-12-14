noflo = require 'noflo'
url = require 'url'

isRedirectValid = (redirect) ->
  parsedRedirect = url.parse redirect
  parsedAppRedirect = url.parse '$NOFLO_OAUTH_CLIENT_REDIRECT'
  return parsedRedirect.host is parsedAppRedirect.host

getRedirect = (params) ->
  return params.redirect or window.location.href

getUrl = (params) ->
  redirect = getRedirect params
  provider = if params.provider? then "/#{params.provider}" else ""
  "#{params.site}$NOFLO_OAUTH_ENDPOINT_AUTHORIZE#{provider}?client_id=#{encodeURIComponent(params.clientid)}&scope=#{encodeURIComponent(params.scope)}&response_type=code&redirect_uri=#{encodeURIComponent(redirect)}"

checkToken = (url, params, callback) ->
  code = url.match /\?code=(.*)/
  return callback null, null unless code
  return callback null, null unless code[1]
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

      callback null, token_found
      return
    try
      data = JSON.parse req.responseText
      callback new Error "Authentication token exchange failed with #{data.error}"
    catch e
      callback new Error e

  config =
    client_secret: '$NOFLO_OAUTH_CLIENT_SECRET'

  # get token directly from provider
  if config.client_secret
    redirect = params.redirect or window.location.href
    post_params = "code=#{code[1]}&client_id=#{params.clientid}&grant_type=authorization_code&client_secret=#{config.client_secret}&redirect_uri=#{encodeURIComponent(redirect)}"
    req.open 'POST', "#{params.site}$NOFLO_OAUTH_ENDPOINT_TOKEN", true
    # Set headers required for POST request
    req.setRequestHeader "Content-Type", "application/x-www-form-urlencoded"
    req.setRequestHeader "Content-length", post_params.length
    req.setRequestHeader "Connection", "close"
    # Send data
    req.send post_params
  # get token from oauth2 gate
  else
    req.open 'GET', "#{params.gatekeeper}$NOFLO_OAUTH_ENDPOINT_AUTHENTICATE/#{code[1]}", true
    req.send null


exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'login',
    datatype: 'bang'
    required: true
  c.inPorts.add 'check',
    datatype: 'bang'
  c.inPorts.add 'site',
    datatype: 'string'
    required: true
  c.inPorts.add 'gatekeeper',
    datatype: 'string'
    required: true
  c.inPorts.add 'provider',
    datatype: 'string'
    required: false
  c.inPorts.add 'clientid',
    datatype: 'string'
    required: true
  c.inPorts.add 'scope',
    datatype: 'string'
    required: true
  c.inPorts.add 'redirect',
    datatype: 'string'
    required: false
  c.outPorts.add 'token',
    datatype: 'string'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'login'
    params: [
      'site'
      'gatekeeper'
      'provider'
      'clientid'
      'scope'
      'redirect'
    ]
    out: 'token'
    async: true
  , (start, groups, out, callback) ->
    if typeof chrome isnt 'undefined' and chrome.identity
      c.params.redirect = chrome.identity.getRedirectURL()
      chrome.identity.launchWebAuthFlow
        interactive: true
        url: getUrl c.params
      , (responseUrl) ->
        checkToken responseUrl, c.params, (err, token) ->
          return callback err if err
          return callback new Error('No token available') unless token
          out.send token
          do callback
      return

    # Validate that redirect URL matches the one configured for app
    unless isRedirectValid getRedirect c.params
      return callback new Error "App URL must match GitHub app configuration $NOFLO_OAUTH_CLIENT_REDIRECT"

    # On browser we just redirect
    window.location.href = getUrl c.params

  c.inPorts.check.on 'data', ->
    if typeof chrome isnt 'undefined' and chrome.identity
      return

    # With browser we check the URL also initially
    checkToken window.location.href, c.params, (err, token) ->
      if err
        # Send error with timeout so other context-affecting ops have time to finish
        setTimeout ->
          c.outPorts.error.send err
          c.outPorts.error.disconnect()
        , 1000
        return
      return unless token
      c.outPorts.token.send token
      c.outPorts.token.disconnect()

  c
