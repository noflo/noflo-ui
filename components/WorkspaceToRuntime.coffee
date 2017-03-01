noflo = require 'noflo'

sendProject = (project, runtime, out) ->
  if project.components?.length
    sendComponent component, runtime, out.component for component in project.components
  if project.graphs?.length
    sendGraph graph, runtime, project, out.graph for graph in project.graphs

sendComponent = (component, runtime, out) ->
  return unless component.code

  # Check for platform-specific components
  runtimeType = component.code.match /@runtime ([a-z\-]+)/
  if runtimeType
    return unless runtimeType[1] in ['all', runtime.definition.type]

  out.send
    command: 'source'
    payload:
      name: component.name
      language: component.language
      library: component.project or component.library
      code: component.code
      tests: component.tests

sendGraph = (graph, runtime, project, out) ->
  if graph.properties.environment?.type
    return unless graph.properties.environment.type in ['all', runtime.definition.type]

  graphId = graph.properties.name or graph.id
  out.send
    command: 'clear'
    payload:
      id: graphId
      name: graph.name
      library: graph.properties.project
      main: (not project or graph.properties.id is project.main)
      icon: graph.properties.icon or ''
      description: graph.properties.description or ''
  for name, def of graph.processes
    out.send
      command: 'addnode'
      payload:
        id: name
        component: def.component
        metadata: def.metadata
        graph: graphId
  for edge in graph.connections
    if edge.src
      out.send
        command: 'addedge'
        payload:
          src:
            node: edge.src.node
            port: edge.src.port
          tgt:
            node: edge.tgt.node
            port: edge.tgt.port
          metadata: edge.metadata
          graph: graphId
      continue
    out.send
      command: 'addinitial'
      payload:
        src:
          data: edge.data
        tgt:
          node: edge.tgt.node
          port: edge.tgt.port
        metadata: edge.metadata
        graph: graphId
  if graph.inports
    for pub, priv of graph.inports
      out.send
        command: 'addinport'
        payload:
          public: pub
          node: priv.process
          port: priv.port
          metadata: priv.metadata
          graph: graphId
  if graph.outports
    for pub, priv of graph.outports
      out.send
        command: 'addoutport'
        payload:
          public: pub
          node: priv.process
          port: priv.port
          metadata: priv.metadata
          graph: graphId

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'graph',
    datatype: 'object'
  c.outPorts.add 'component',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    out: ['graph', 'component']
    async: true
  , (data, groups, out, callback) ->
    unless data.project
      # No project to send
      return callback()
    unless data.runtime.selected
      # No runtime to send to
      return callback()
    sendProject data.project, data.runtime.selected, out
    do callback
