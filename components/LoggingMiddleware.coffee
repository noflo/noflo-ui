noflo = require 'noflo'
debugAction = require('debug') 'noflo-ui:action'
debugActionFull = require('debug') 'noflo-ui:action:full'
debugError = require('debug') 'noflo-ui:error'

sendEvent = (label, action = 'click', category = 'menu') ->
  return unless typeof window.ga is 'function'
  window.ga 'send', 'event', category, action, label

registerPageView = (hash) ->
  return unless typeof window.ga is 'function'
  return unless hash
  if hash.indexOf('?') isnt -1
    # Don't send connection details
    hash = hash.split('?')[0]
  window.ga 'set', 'page', "#{window.location.pathname}#{window.location.search}##{hash}"
  window.ga 'send', 'pageview'

exports.getComponent = ->
  c = new noflo.Component
  c.icon = 'file-text'
  c.inPorts.add 'in',
    datatype: 'all'
  c.outPorts.add 'pass',
    datatype: 'all'

  noflo.helpers.WirePattern c,
    in: 'in'
    out: 'pass'
    forwardGroups: true
    async: true
  , (data, groups, out, callback) ->
    action = data.action
    debugAction action
    debugActionFull action, data.payload

    if action.match /:error$/
      debugError data.payload

    switch action
      when 'application:hash'
        registerPageView data.payload
      when 'user:login'
        sendEvent 'userLogin'
      when 'user:logout'
        sendEvent 'userLogout'
      when 'github:open'
        sendEvent 'pullGithub', 'navigation', 'url'
      when 'gist:open'
        sendEvent 'pullGist', 'navigation', 'url'
      when 'main:open'
        sendEvent 'openHome', 'navigation', 'url'
      when 'runtime:start'
        sendEvent 'startRuntime', 'click', 'button'
      when 'runtime:stop'
        sendEvent 'stopRuntime', 'click', 'button'
      when 'runtime:output'
        console.error data.payload.output.message if data.payload.output.message
      when 'runtime:processerror'
        console.error data.payload.error.error
      when 'runtime:networkerror'
        console.error data.payload.error
      when 'runtime:protocolerror'
        console.error data.payload.error
      when 'runtime:error'
        console.error data.payload

    out.send data
    do callback
