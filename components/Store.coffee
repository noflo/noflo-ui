noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'action',
    datatype: 'all'
  c.inPorts.add 'state',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  c.inPorts.state.on 'data', (data) ->
    c.state = data

  c.state = {}
  c.shutdown = ->
    c.state = {}

  noflo.helpers.WirePattern c,
    in: 'action'
    forwardGroups: true
    async: true
  , (data, groups, out, callback) ->
    out.send
      action: groups.join ':'
      state: c.state
      payload: data
    do callback
