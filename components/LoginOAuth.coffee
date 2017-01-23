noflo = require 'noflo'
url = require 'url'
qs = require 'querystring'

isRedirectValid = (redirect) ->
  parsedRedirect = url.parse redirect
  parsedAppRedirect = url.parse '$NOFLO_OAUTH_CLIENT_REDIRECT'
  return parsedRedirect.host is parsedAppRedirect.host

getUrl = (params) ->
  query =
    client_id: '$NOFLO_OAUTH_CLIENT_ID'
    response_type: 'code'
    redirect_uri: params.url
  query.scope = params.scopes.join ' ' if params.scopes.length
  "$NOFLO_OAUTH_PROVIDER$NOFLO_OAUTH_ENDPOINT_AUTHORIZE?#{qs.stringify(query)}"

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'string'
  c.outPorts.add 'code',
    datatype: 'string'
  c.outPorts.add 'redirect',
    datatype: 'string'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    out: ['code', 'redirect']
    async: true
  , (data, groups, out, callback) ->
    if typeof chrome isnt 'undefined' and chrome.identity
      # With Chrome apps we do login via the WebAuthFlow
      redirect = chrome.identity.getRedirectURL()
      chrome.identity.launchWebAuthFlow
        interactive: true
        url: getUrl
          url: chrome.identity.getRedirectURL()
          scopes: data.scopes
      , (responseUrl) ->
        # Handle error
        # Handle grant code
      return

    unless isRedirectValid data.url
      return callback new Error "App URL must match GitHub app configuration $NOFLO_OAUTH_CLIENT_REDIRECT"

    out.redirect.send getUrl data
    do callback
