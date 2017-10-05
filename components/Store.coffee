noflo = require 'noflo'
debug = require('debug') 'noflo-ui:state'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'action',
    datatype: 'all'
  c.inPorts.add 'state',
    datatype: 'object'
  c.outPorts.add 'pass',
    datatype: 'object'

  c.inPorts.state.on 'data', (state) ->
    c.state = state

  c.state = {}
  c.shutdown = ->
    c.state = {}
  noflo.helpers.WirePattern c,
    in: 'action'
    out: 'pass'
    forwardGroups: false
    async: true
  , (data, groups, out, callback) ->
    if typeof data is 'object' and data.payload and data.action
      # New-style action object
      if data.state
        # Keep track of last state
        c.state = data.state
      else
        debug "#{data.action} was sent without state, using previous state"
      out.send
        action: data.action
        state: data.state or c.state
        payload: data.payload
      do callback
      return
    # Old-style action with only payload, and action defined by brackets
    action = groups.join ':'
    debug "#{action} was sent in legacy payload-only format"
    out.send
      action: action
      state: c.state
      payload: data
    do callback
