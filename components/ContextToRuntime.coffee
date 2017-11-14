noflo = require 'noflo'
_ = require 'underscore'

sendContext = (context, callback) ->
  if context.project
    sendProject context.project, context.runtime
    do callback
    return

  if context.graphs?.length
    sendGraph null, graph, context.runtime for graph in context.graphs
    do callback
    return

  do callback

sendProject = (project, runtime) ->
  namespace = project.namespace or project.id
  if project.components
    sendComponent namespace, component, runtime for component in project.components
  if project.graphs
    sendGraph namespace, graph, runtime for graph in project.graphs

sendComponent = (namespace, component, runtime) ->
  return unless component.code

  # Check for platform-specific components
  runtimeType = component.code.match /@runtime ([a-z\-]+)/
  if runtimeType
    return unless runtimeType[1] in ['all', runtime.definition.type]

  return unless runtime.canDo 'component:setsource'

  runtime.sendComponent 'source',
    name: component.name
    language: component.language
    library: namespace
    code: component.code
    tests: component.tests

sendGraph = (namespace, graph, runtime) ->
  if graph.properties.environment?.type
    return unless graph.properties.environment.type in ['all', runtime.definition.type]

  return unless runtime.canDo 'protocol:graph'

  graphId = graph.name or graph.properties.id
  runtime.sendGraph 'clear',
    id: graphId
    name: graph.name
    library: namespace
    main: graph.properties.main or false
    icon: graph.properties.icon or ''
    description: graph.properties.description or ''
  for node in graph.nodes
    runtime.sendGraph 'addnode',
      id: node.id
      component: node.component
      metadata: node.metadata
      graph: graphId
  for edge in graph.edges
    runtime.sendGraph 'addedge',
      src:
        node: edge.from.node
        port: edge.from.port
      tgt:
        node: edge.to.node
        port: edge.to.port
      metadata: edge.metadata
      graph: graphId
  for iip in graph.initializers
    runtime.sendGraph 'addinitial',
      src:
        data: iip.from.data
      tgt:
        node: iip.to.node
        port: iip.to.port
      metadata: iip.metadata
      graph: graphId
  if graph.inports
    for pub, priv of graph.inports
      runtime.sendGraph 'addinport',
        public: pub
        node: priv.process
        port: priv.port
        graph: graphId
  if graph.outports
    for pub, priv of graph.outports
      runtime.sendGraph 'addoutport',
        public: pub
        node: priv.process
        port: priv.port
        graph: graphId

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'context',
    datatype: 'object'
  c.outPorts.add 'context',
    datatype: 'object'

  c.current = null

  unsubscribe = ->
    return unless c.current
    c.current.runtime.removeListener 'capabilities', c.current.sender
    c.current.ctx.deactivate()
    c.current = null

  c.tearDown = (callback) ->
    do unsubscribe
    do callback

  c.forwardBrackets = {}
  c.process (input, output, context) ->
    return unless input.hasData 'context'
    payload = input.getData 'context'
    unless payload.runtime
      # No runtime associated with the context, unsubscribe previous
      unsubscribe()
      output.done()
      return
    if c.current?.runtime and c.current?.payload?.graphs[0] isnt payload.graphs[0]
      # We have an existing runtime connection, with different main graph
      if c.current.runtime is payload.runtime
        # Same runtime, different graph. Reconnect to clear caches
        c.current.runtime.removeListener 'capabilities', c.current.sender
        c.current.runtime.reconnect()
      else
        # Different runtime, different graph. Disconnect old runtime connection
        c.current.runtime.disconnect()
        do unsubscribe

    # Prepare to send data
    send = _.debounce sendContext, 300, true
    c.current =
      runtime: payload.runtime
      payload: payload
      ctx: context
      sender: ->
        return unless c.current.payload is payload
        send payload, ->
          output.send
            context: payload

    if payload.runtime.isConnected()
      # We're already connected, send context to runtime right away
      send payload, ->
        output.send
          context: payload

    # If runtime reconnects, we need to re-send the context in case
    # runtime doesn't have persistent state
    payload.runtime.on 'capabilities', c.current.sender
