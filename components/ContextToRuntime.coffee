noflo = require 'noflo'

sendContext = (context) ->
  if context.project
    sendProject context.project, context.runtime
    return

  if context.graphs?.length
    sendGraph graph, context.runtime for graph in context.graphs
    return

sendProject = (project, runtime) ->
  if project.components
    sendComponent component, runtime for component in project.components
  if project.graphs
    sendGraph graph, runtime, project for graph in project.graphs

sendComponent = (component, runtime) ->
  return unless component.code

  # Check for platform-specific components
  runtimeType = component.code.match /@runtime ([a-z\-]+)/
  if runtimeType
    return unless runtimeType[1] in ['all', runtime.definition.type]

  return unless runtime.canDo 'component:setsource'

  runtime.sendComponent 'source',
    name: component.name
    language: component.language
    library: component.project or component.library
    code: component.code
    tests: component.tests

sendGraph = (graph, runtime, project) ->
  if graph.properties.environment?.type
    return unless graph.properties.environment.type in ['all', runtime.definition.type]

  return unless runtime.canDo 'protocol:graph'

  graphId = graph.name or graph.properties.id
  runtime.sendGraph 'clear',
    id: graphId
    name: graph.name
    library: graph.properties.project
    main: (not project or graph.properties.id is project.main)
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

currentContext = null

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'context',
    datatype: 'object'
    process: (event, payload) ->
      return unless event is 'data'
      return unless payload.runtime
      if currentContext?.runtime and currentContext.graphs[0] isnt payload.graphs[0]
        currentContext.runtime.removeListener 'capabilities', sender
        if currentContext.runtime is payload.runtime
          # Same runtime, different graph. Reconnect to clear caches
          currentContext.runtime.reconnect()
        else
          # Different runtime, different graph. Disconnect old runtime connection
          currentContext.runtime.disconnect()

      # Prepare to send data
      currentContext = payload
      sendContext payload if payload.runtime.isConnected()
      sender = ->
        return unless currentContext is payload
        sendContext payload
        c.outPorts.context.send payload
        c.outPorts.context.disconnect()

      payload.runtime.on 'capabilities', sender

      if payload.runtime.isConnected()
        c.outPorts.context.send payload
        c.outPorts.context.disconnect()

  c.outPorts.add 'context',
    datatype: 'object'

  c
