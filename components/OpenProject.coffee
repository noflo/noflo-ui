noflo = require 'noflo'

buildContext = ->
  ctx =
    state: ''
    project: null
    runtime: null
    component: null
    graphs: []
    remote: []

findProject = (id, projects) ->
  return unless projects
  for project in projects
    return project if project.id is id
  return null

findGraph = (id, project) ->
  return unless project.graphs
  for graph in project.graphs
    return graph if graph.name is id
    return graph if graph.properties.id is id
  return null

findComponent = (name, project) ->
  return unless project.components
  for component in project.components
    return component if component.name is name
  return null

findByComponent = (componentName, project) ->
  [library, name] = componentName.split '/'

  unless name
    name = library
    library = undefined

  graph = findGraph name, project
  return ['graph', graph] if graph

  component = findComponent name, project
  return ['component', component] if component

  # Get from runtime
  return ['runtime', componentName]

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
    forwardGroups: false
  , (data, groups, out, callback) ->
    # Find project
    unless data.state.projects?.length
      return callback new Error 'No projects found'
    ctx = buildContext()
    ctx.project = findProject data.payload.project, data.state.projects
    unless ctx.project
      return callback new Error "Project #{data.payload.project} not found"

    # Find component if needed
    if data.payload.component
      ctx.component = findComponent data.payload.component, ctx.project
      unless ctx.component
        return callback new Error "Component #{data.payload.component} not found"
      ctx.state = 'ok'
      out.send ctx
      do callback
      return

    # Find main graph
    mainGraph = findGraph data.payload.graph, ctx.project
    unless mainGraph
      return callback new Error "Graph #{data.payload.graph} not found"
    ctx.graphs.push mainGraph

    # Look up the node tree
    currentGraph = mainGraph
    while data.payload.nodes.length
      nodeId = data.payload.nodes.shift()
      unless typeof currentGraph is 'object'
        ctx.remote.push nodeId
        continue
      node = currentGraph.getNode nodeId
      unless node
        return callback new Error "Node #{nodeId} not found"
      unless node.component
        return callback new Error "Node #{nodeId} has no component defined"
      [type, currentGraph] = findByComponent node.component, ctx.project

      if type is 'component'
        ctx.component = currentGraph
        if data.payload.nodes.length
          return callback new Error "Component #{nodeId} cannot have subnodes"
        break

      if type is 'runtime'
        ctx.remote.push currentGraph
        continue

      ctx.graphs.push currentGraph

    ctx.state = if ctx.remote.length then 'loading' else 'ok'
    out.send ctx

    do callback
