noflo = require 'noflo'
url = require 'url'
qs = require 'querystring'

isRedirectValid = (redirect, chrome) ->
  parsedRedirect = url.parse redirect
  if chrome
    parsedAppRedirect = url.parse '$NOFLO_OAUTH_CHROME_CLIENT_REDIRECT'
  else if window.location.protocol is 'https:' and '$NOFLO_OAUTH_SSL_CLIENT_ID'
    parsedAppRedirect = url.parse '$NOFLO_OAUTH_SSL_CLIENT_REDIRECT'
  else
    parsedAppRedirect = url.parse '$NOFLO_OAUTH_CLIENT_REDIRECT'
  return parsedRedirect.host is parsedAppRedirect.host

getUrl = (params) ->
  query =
    client_id: params.client
    response_type: 'code'
    redirect_uri: params.url
  query.scope = params.scopes.join ' ' if params.scopes.length
  "$NOFLO_OAUTH_PROVIDER$NOFLO_OAUTH_ENDPOINT_AUTHORIZE?#{qs.stringify(query)}"

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'string'
  c.outPorts.add 'codeurl',
    datatype: 'string'
  c.outPorts.add 'redirect',
    datatype: 'string'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    out: ['codeurl', 'redirect']
    async: true
  , (data, groups, out, callback) ->
    if typeof chrome isnt 'undefined' and chrome.identity
      # With Chrome apps we do login via the WebAuthFlow
      redirect = chrome.identity.getRedirectURL()
      unless isRedirectValid redirect, true
        return callback new Error "App URL must match GitHub app configuration $NOFLO_OAUTH_CHROME_CLIENT_REDIRECT"

      chrome.identity.launchWebAuthFlow
        interactive: true
        url: getUrl
          client: '$NOFLO_OAUTH_CHROME_CLIENT_ID'
          url: chrome.identity.getRedirectURL()
          scopes: data.payload.scopes
      , (responseUrl) ->
        out.codeurl.send
          payload: responseUrl
        do callback
      return

    unless isRedirectValid data.payload.url
      return callback new Error "App URL must match GitHub app configuration $NOFLO_OAUTH_CLIENT_REDIRECT"

    params =
      client: '$NOFLO_OAUTH_CLIENT_ID'
      url: data.payload.url
      scopes: data.payload.scopes
    if window.location.protocol is 'https:' and '$NOFLO_OAUTH_SSL_CLIENT_ID'
      params.client = '$NOFLO_OAUTH_SSL_CLIENT_ID'
    out.redirect.send getUrl params
    do callback
