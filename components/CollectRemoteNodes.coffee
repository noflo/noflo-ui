noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'context',
    datatype: 'object'
  c.inPorts.add 'component',
    datatype: 'object'
  c.inPorts.add 'error',
    datatype: 'object'
  c.outPorts.add 'runtime',
    datatype: 'object'
  c.outPorts.add 'component',
    datatype: 'string'
  c.outPorts.add 'context',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'
  c.context = null
  c.tearDown = (callback) ->
    c.context = null
    do callback
  c.process (input, output) ->
    if input.hasData 'context'
      payload = input.getData 'context'
      unless payload.remote?.length
        # No remote nodes to fetch
        c.context = null
        output.sendDone
          context: payload
        return
      unless payload.runtime
        output.done new Error 'No runtime connection for getting remote nodes'
        return
      c.context = payload
      output.send
        runtime: c.context.runtime
      output.send
        component: c.context.remote.shift()
      output.done()
      return
    if input.hasData 'component'
      payload = input.getData 'component'
      unless c.context
        # No pending context
        output.done()
        return
      if payload.language is 'json'
        noflo.graph.loadJSON JSON.parse(payload.code), (err, graph) ->
          return output.done err if err
          graph.name = [payload.library, payload.name].join '/'
          unless graph.properties.environment
            graph.properties.environment = {}
            if c.context.runtime?.definition?.type
              graph.properties.environment.type = c.context.runtime.definition.type
          c.context.graphs.push graph
          unless c.context.remote.length
            c.context.state = 'ok'
            output.send
              context: c.context
            c.context = null
            output.done()
            return
          nodeName = c.context.remote.shift()
          node = graph.getNode nodeName
          return output.done new Error "Node '#{nodeName}' not available" unless node
          output.sendDone
            component: node.component
        return
      c.context.component = payload
      if c.context.remote.length
        output.done new Error 'Components are the lowest navigation level'
        return
      c.context.state = 'ok'
      output.send
        context: c.context
      c.context = null
      output.done()
      return
    if input.hasData 'error'
      payload = input.getData 'error'
      c.context = null
      output.done payload
      return
