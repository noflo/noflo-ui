noflo = require 'noflo'
debug = require('debug') 'noflo-ui:state'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'all'
  c.outPorts.add 'pass',
    datatype: 'object'

  c.state = {}
  c.shutdown = ->
    c.state = {}
  noflo.helpers.WirePattern c,
    in: 'in'
    out: 'pass'
    forwardGroups: true
    async: true
  , (data, groups, out, callback) ->
    if data?.state
      # Keep track of last state
      c.state = data.state
    else
      # Warn of actions that don't contain state
      debug "#{groups.join(':')} was sent without state, using previous state"
    state = data?.state or c.state
    payload = data?.payload or data
    out.send
      state: state
      payload: payload
    do callback
