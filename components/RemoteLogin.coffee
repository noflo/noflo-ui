noflo = require 'noflo'

getUrl = (params) ->
  redirect = params.redirect or window.location.href
  "#{params.site}$NOFLO_OAUTH_ENDPOINT_AUTHORIZE/#{params.provider}?client_id=#{params.clientid}&scope=#{params.scope}&response_type=code&redirect_uri=#{encodeURIComponent(redirect)}"

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
      catch e
        return callback e
      unless data.token
        return callback null, null

      callback null, data.token
  # get token directly from provider
  if '$NOFLO_OAUTH_CLIENT_SECRET' isnt ''
    redirect = params.redirect or window.location.href
    req.open 'POST', "#{params.site}$NOFLO_OAUTH_ENDPOINT_TOKEN", true
    req.send 'code=#{code[1]}&client_id=#{params.clientid}&grant_type=authorization_code&client_secret=$NOFLO_OAUTH_CLIENT_SECRET&redirect_uri=#{encodeURIComponent(redirect)}'
  # get token from oauth2 gate
  if '$NOFLO_OAUTH_CLIENT_SECRET' is '' or null
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
    required: true
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

    # On browser we just redirect
    window.location.href = getUrl c.params

  c.inPorts.check.on 'data', ->
    if typeof chrome isnt 'undefined' and chrome.identity
      return

    # With browser we check the URL also initially
    checkToken window.location.href, c.params, (err, token) ->
      return if err
      return unless token
      c.outPorts.token.send token
      c.outPorts.token.disconnect()

  c
