noflo = require 'noflo'

sendProject = (project, runtime) ->
  console.log "PROJECT", project
  console.log "RUNTIME", runtime
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

  graphId = graph.properties.name or graph.id
  runtime.sendGraph 'clear',
    id: graphId
    name: graph.name
    library: graph.properties.project
    main: (not project or graph.properties.id is project.main)
    icon: graph.properties.icon or ''
    description: graph.properties.description or ''
  for name, def of graph.processes
    runtime.sendGraph 'addnode',
      id: name
      component: def.component
      metadata: def.metadata
      graph: graphId
  for edge in graph.connections
    if edge.src
      runtime.sendGraph 'addedge',
        src:
          node: edge.src.node
          port: edge.src.port
        tgt:
          node: edge.tgt.node
          port: edge.tgt.port
        metadata: edge.metadata
        graph: graphId
      continue
    runtime.sendGraph 'addinitial',
      src:
        data: edge.data
      tgt:
        node: edge.tgt.node
        port: edge.tgt.port
      metadata: edge.metadata
      graph: graphId
  if graph.inports
    for pub, priv of graph.inports
      runtime.sendGraph 'addinport',
        public: pub
        node: priv.process
        port: priv.port
        metadata: priv.metadata
        graph: graphId
  if graph.outports
    for pub, priv of graph.outports
      runtime.sendGraph 'addoutport',
        public: pub
        node: priv.process
        port: priv.port
        metadata: priv.metadata
        graph: graphId

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    async: true
  , (data, groups, out, callback) ->
    unless data.project
      # No project to send
      out.send data
      return callback()
    unless data.runtime.selected
      # No runtime to send to
      out.send data
      return callback()
    sendProject data.project, data.runtime.selected, (err) ->
      return callback err if err
      out.send data
      do callback
