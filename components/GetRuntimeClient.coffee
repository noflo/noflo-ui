noflo = require 'noflo'
fbpClient = require 'fbp-client'

# @runtime noflo-browser

ensureInstance = (definition, clients, output) ->
  if definition.id and clients[definition.id]
    # Already have a client instance for this one
    return Promise.resolve clients[definition.id]
  definition.secret = '' unless definition.secret
  return fbpClient(definition)
  .then((client) ->
    output.send
      instance: client
    return client unless client.definition.id

    clientId = definition.id
    clients[clientId] = client

    unless client.isConnected()
      # Since we're not connected, the ID may change once we do
      client.once 'connected', ->
        return if client.definition.id is clientId
        delete clients[clientId]
        clients[client.definition.id] = client

    return client
  )

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
      Promise.all(runtimes.map((def) -> ensureInstance(def, c.clients, output)))
      .then((() -> output.done()), (err) -> output.done(err))
      return
    if input.hasData 'updated'
      data = input.getData 'updated'
      runtime = data.payload or data
      runtime.secret = '' unless runtime.secret
      # TODO: Disconnect previous as needed
      return ensureInstance(runtime, c.clients, output)
      .then((() ->
        output.send
          updated: data
        output.done()
      ), (err) -> output.done(err))
      return
    indexesWithData = input.attached('in').filter (idx) -> input.hasData ['in', idx]
    return unless indexesWithData.length
    Promise.all(indexesWithData.map((idx) ->
      route = input.getData ['in', idx]
      unless route.runtime
        return Promise.reject new Error "No runtime defined"
      runtime = route.runtime
      if typeof route.runtime is 'string'
        runtime =
          id: route.runtime
      return ensureInstance(runtime, c.clients, output)
      .then((instance) ->
        def =
          client: instance
          route: route
          idx: idx
        return def
      )
    ))
      .then((runtimes) ->
        for runtime in runtimes
          output.send
            client: new noflo.IP 'data', runtime.client,
              index: runtime.idx
            out: new noflo.IP 'data', runtime.route,
              index: runtime.idx
      )
      .then((() -> output.done()), (err) -> output.done(err))
  return c
