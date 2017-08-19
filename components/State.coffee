noflo = require 'noflo'

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
  noflo.helpers.WirePattern c,
    in: 'in'
    out: ['state', 'updated']
    async: true
    forwardGroups: false
  , (data, groups, out, callback) ->
    for key, val of data
      c.state[key] = val
    out.state.send c.state
    out.updated.send data
    do callback
