noflo = require 'noflo'
debugAction = require('debug') 'noflo-ui:action'
debugActionFull = require('debug') 'noflo-ui:action:full'
debugState = require('debug') 'noflo-ui:state'

sendEvent = (label, action = 'click', category = 'menu') ->
  return unless typeof window.ga is 'function'
  window.ga 'send', 'event', category, action, label

exports.getComponent = ->
  c = new noflo.Component
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
    action = groups.join ':'
    debugAction action
    debugActionFull action, data.payload
    debugState data.state

    switch action
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

    out.send data
    do callback
