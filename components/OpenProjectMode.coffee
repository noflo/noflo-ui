noflo = require 'noflo'
{ getGraphType, getComponentType, getRemoteNodes } = require '../src/runtime'

sendGraphs = (client, graphs, currentGraphs) ->
  compatible = graphs.filter (g) -> getGraphType(g) is client.definition.type
  Promise.all(compatible.map((g) ->
    main = if g is currentGraphs[0] then true else false
    client.protocol.graph.send(g, main)
  ))

sendComponents = (client, components, namespace) ->
  compatible = components.filter (c) -> getComponentType(c) is client.definition.type
  Promise.all(compatible.map((c) -> client.protocol.component.setsource(
    name: c.name
    language: c.language
    library: namespace or client.definition.namespace
    code: c.code
  )))

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'client',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  c.process (input, output) ->
    return unless input.hasData 'in', 'client'
    [route, client] = input.getData 'in', 'client'

    if route.remote?.length
      # We need to fetch components from runtime, send "loading"
      route.state = 'loading'
    # Send initial state
    output.send
      out: route

    if client.definition.protocol is 'iframe' and not client.transport.iframe
      # FIXME: We'll want to make this configurable
      client.transport.setParentElement document.body

    client.connect()
      .then(() ->
        sendComponents client, route.project.components, route.project.namespace
      )
      .then(() ->
        sendGraphs client, route.project.graphs, route.graphs
      )
      .then(() ->
        getRemoteNodes client, route
      )
      .then(() ->
        return Promise.resolve() unless route.state is 'loading'
        # We fetched things from runtime, update state
        route.state = 'ok'
        output.send
          out: route
      )
      .then((() -> output.done()), (err) -> output.done(err))
