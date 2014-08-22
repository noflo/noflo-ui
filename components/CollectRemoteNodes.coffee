noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.context = null
  c.inPorts.add 'context',
    datatype: 'object'
    process: (event, payload) ->
      return unless event is 'data'
      unless payload.remote?.length
        c.outPorts.context.send payload
        c.outPorts.context.disconnect()
        return
      unless payload.runtime
        c.error new Error 'No runtime connection for getting remote nodes'
        return
      c.context = payload
      c.outPorts.runtime.send c.context.runtime
      c.outPorts.runtime.disconnect()
      for node in c.context.remote
        c.outPorts.component.send node
      c.outPorts.component.disconnect()
  c.inPorts.add 'component',
    datatype: 'object'
    process: (event, payload) ->
      return unless event is 'data'
      return unless c.context
      c.context.component = payload
      c.context.state = 'ok'
      c.outPorts.context.send c.context
      c.outPorts.context.disconnect()
      c.context = null
  c.inPorts.add 'error',
    datatype: 'object'
    process: (event, payload) ->
      return unless event is 'data'
      c.context = null
      c.error payload
  c.outPorts.add 'runtime',
    datatype: 'object'
  c.outPorts.add 'component',
    datatype: 'string'
  c.outPorts.add 'context',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'
  c
