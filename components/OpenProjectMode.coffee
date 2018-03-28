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

# Scope iframe runtimes to project
ensureIframe = (client, project) ->
  client.definition.querySelector = "iframe[data-runtime='#{client.definition.id}'][data-project='#{project.id}']"
  iframe = document.body.querySelector client.definition.querySelector
  unless iframe
    # No iframe for this runtime/project combination yet, create
    iframe = document.createElement 'iframe'
    iframe.setAttribute 'sandbox', 'allow-scripts allow-same-origin allow-forms'
    iframe.setAttribute 'data-runtime', client.definition.id
    iframe.setAttribute 'data-project', project.id
    iframe.className = 'iframe-runtime'
    document.body.appendChild iframe
  unless client.transport.iframe
    # Client has not been connected yet
    client.transport.iframe = iframe
    return Promise.resolve()
  if client.transport.iframe is iframe
    # We were already connected to this one
    return Promise.resolve()
  # We were connected to another iframe
  # Disconnect and set new
  return client.disconnect()
    .then(() ->
      client.transport.iframe = iframe
      Promise.resolve()
    )

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

    Promise.resolve()
      .then(() ->
        unless client.definition.protocol is 'iframe'
          return Promise.resolve()
        ensureIframe(client, route.project)
      )
      .then(() -> client.connect())
      .then(() ->
        sendComponents client, route.project.components, route.project.namespace
      )
      .then(() ->
        sendGraphs client, route.project.graphs, route.graphs
      )
      .then(() ->
        unless route.graphs?.length
          return Promise.resolve()
        if client.transport.graph is route.graphs[0]
          return Promise.resolve()
        client.transport.setMain(route.graphs[0])
        return Promise.resolve()
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
