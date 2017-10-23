noflo = require 'noflo'
debug = require('debug') 'noflo-ui:store'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'action',
    datatype: 'all'
  c.inPorts.add 'state',
    datatype: 'object'
  c.outPorts.add 'pass',
    datatype: 'object'

  c.state = {}
  c.tearDown = (callback) ->
    c.state = {}
    do callback
  c.forwardBrackets = {}
  c.process (input, output) ->
    if input.hasData 'state'
      c.state = input.getData 'state'
      output.done()
      return
    return unless input.hasStream 'action'
    packets = []
    brackets = []
    input.getStream('action').forEach (ip) ->
      if ip.type is 'openBracket'
        brackets.push ip.data
      if ip.type is 'closeBracket'
        brackets.pop()
      if ip.type is 'data'
        packets.push
          data: ip.data
          brackets: brackets.slice 0
    for packet in packets
      data = packet.data
      if data and typeof data is 'object' and data.payload and data.action
        # New-style action object
        if data.state
          # Keep track of last state
          c.state = data.state
        else
          debug "#{data.action} was sent without state, using previous state"
        output.send
          pass:
            action: data.action
            state: c.state
            payload: data.payload
        continue
      # Old-style action with only payload, and action defined by brackets
      action = packet.brackets.join ':'
      debug "#{action} was sent in legacy payload-only format"
      output.send
        pass:
          action: action
          state: c.state
          payload: data
    output.done()
    return
