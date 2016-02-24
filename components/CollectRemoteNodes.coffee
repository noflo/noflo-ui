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
      c.outPorts.component.send c.context.remote.shift()
  c.inPorts.add 'component',
    datatype: 'object'
    process: (event, payload) ->
      return unless event is 'data'
      return unless c.context
      if payload.language is 'json'
        noflo.graph.loadJSON JSON.parse(payload.code), (err, graph) ->
          graph.name = [payload.library, payload.name].join '/'
          c.context.graphs.push graph
          unless c.context.remote.length
            c.context.state = 'ok'
            c.outPorts.context.send c.context
            c.outPorts.context.disconnect()
            c.context = null
            return
          node = graph.getNode c.context.remote.shift()
          return c.error new Error 'Node not available' unless node
          c.outPorts.component.send node.component
        return
      c.context.component = payload
      if c.context.remote.length
        return c.error new Error 'Components are the lowest navigation level'
      c.context.state = 'ok'
      c.outPorts.context.send c.context
      c.outPorts.context.disconnect()
      c.context = null
  c.inPorts.add 'error',
    datatype: 'object'
    process: (event, payload) ->
      return unless event is 'data'
      c.context = null
      c.outPorts.component.disconnect()
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
