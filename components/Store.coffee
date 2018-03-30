noflo = require 'noflo'
debug = require('debug') 'noflo-ui:store'

exports.getComponent = ->
  c = new noflo.Component
  c.icon = 'rocket'
  c.inPorts.add 'action',
    datatype: 'all'
  c.inPorts.add 'state',
    datatype: 'object'
  c.outPorts.add 'pass',
    datatype: 'object'
    scoped: false

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
    packets = input.getStream('action').filter((ip) ->
      ip.type is 'data'
    ).map (ip) -> ip.data
    for data in packets
      unless data.action
        console.error 'Received action without expected payload', data
        continue
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
    output.done()
    return
