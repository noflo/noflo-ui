noflo = require 'noflo'
debug = require('debug') 'noflo-ui:state'

exports.getComponent = ->
  c = new noflo.Component
  c.icon = 'database'
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'state',
    datatype: 'object'
  c.outPorts.add 'updated',
    datatype: 'object'
  c.state = {}
  c.tearDown = (callback) ->
    c.state = {}
    do callback
  noflo.helpers.WirePattern c,
    in: 'in'
    out: ['state', 'updated']
    async: true
    forwardGroups: false
  , (data, groups, out, callback) ->
    for key, val of data
      continue if c.state[key] is val
      debug "#{key} changed", c.state[key], val
      c.state[key] = val
    out.state.send c.state
    out.updated.send data
    do callback
