noflo = require 'noflo'
fbpClient = require 'fbp-client'

# @runtime noflo-browser

exports.getComponent = ->
  c = new noflo.Component
  c.description = 'Holder for runtime instances'
  c.inPorts.add 'initial',
    description: 'Initialize client for all stored runtime definitions'
    datatype: 'object'
  c.inPorts.add 'updated',
    description: 'Update client instance for a runtime definition'
    datatype: 'object'
  c.inPorts.add 'in',
    description: 'Get client instance for a route definition'
    datatype: 'object'
    addressable: true
  c.outPorts.add 'instance',
    description: 'Client instance when created'
    datatype: 'object'
  c.outPorts.add 'out',
    description: 'Route runtime client was matched for'
    datatype: 'object'
    addressable: true
  c.outPorts.add 'client',
    description: 'Runtime client instance'
    datatype: 'object'
    addressable: true
  c.outPorts.add 'updated',
    description: 'Updated runtime definition'
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'
  c.clients = {}
  c.tearDown = (callback) ->
    c.clients = {}
    do callback
  c.process (input, output) ->
    if input.hasData 'initial'
      runtimes = input.getData 'initial'
      runtimes = [] unless runtimes
      Promise.all(runtimes.map((def) ->
        def.secret = '' unless def.secret
        return fbpClient(def)
      ))
      .then((clients) ->
        for client in clients
          c.clients[client.definition.id] = client
          output.send
            instance: client
        return clients
      )
      .then((() -> output.done()), (err) -> output.done(err))
      return
    if input.hasData 'updated'
      data = input.getData 'updated'
      data.payload.secret = '' unless data.payload.secret
      # TODO: Disconnect previous as needed
      fbpClient(data.payload)
      .then((client) ->
        c.clients[client.definition.id] = client
        output.send
          instance: client
        return client
      )
      .then((() ->
        output.send
          updated: data
        output.done()
      ), (err) -> output.done(err))
      return
    indexesWithData = input.attached('in').filter (idx) -> input.hasData ['in', idx]
    return unless indexesWithData.length
    for idx in indexesWithData
      route = input.getData ['in', idx]
      unless route.runtime
        output.done new Error "No runtime defined"
        return
      if typeof route.runtime is 'string'
        # Just runtime UUID
        unless c.clients[route.runtime]
          output.done new Error "Runtime #{route.runtime} not found"
          return
        output.send
          client: new noflo.IP 'data', c.clients[route.runtime],
            index: idx
        output.send
          out: new noflo.IP 'data', route,
            index: idx
        continue
      if typeof route.runtime is 'object' and route.runtime.id
        unless c.clients[route.runtime.id]
          output.done new Error "Runtime #{route.runtime.id} not found"
          return
        output.send
          client: new noflo.IP 'data', c.clients[route.runtime.id],
            index: idx
        output.send
          out: new noflo.IP 'data', route,
            index: idx
        continue
      # Unknown definition
      output.done new Error "Unknown runtime definition type"
      return
    output.done()
  return c
