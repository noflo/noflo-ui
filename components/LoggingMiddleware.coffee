noflo = require 'noflo'
debugAction = require('debug') 'noflo-ui:action'
debugActionFull = require('debug') 'noflo-ui:action:full'

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
    debugActionFull action, data
    out.send data
    do callback
