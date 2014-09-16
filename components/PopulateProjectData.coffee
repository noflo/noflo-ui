noflo = require 'noflo'

buildContext = ->
  ctx =
    state: ''
    project: null
    runtime: null
    component: null
    graphs: []
    remote: []

sendError = (out, err) ->
  ctx = buildContext()
  ctx.state = 'error'
  ctx.error = err
  out.send ctx

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
  c.inPorts.add 'projects',
    required: true
    datatype: 'array'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'currentgraph',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    params: ['projects']
    out: ['out', 'currentgraph']
  , (route, groups, out) ->
    # Match to local data
    ctx = buildContext()
    ctx.project = findProject route.project, c.params.projects
    return sendError out.out, new Error 'No project found' unless ctx.project

    if route.component
      ctx.component = findComponent route.component, ctx.project
      return sendError out.out, new Error 'No component found' unless ctx.component
      ctx.state = 'ok'
      out.out.send ctx
      return

    mainGraph = findGraph route.graph, ctx.project
    return sendError out.out, new Error 'No main graph found' unless mainGraph
    ctx.graphs.push mainGraph

    currentGraph = mainGraph
    while route.nodes.length
      nodeId = route.nodes.shift()
      unless typeof currentGraph is 'object'
        ctx.remote.push nodeId
        continue
      node = currentGraph.getNode nodeId
      return sendError out.out, new Error "Node #{nodeId} not found" unless node
      return sendError out.out, new Error "Node #{nodeId} has no component defined" unless node.component
      [type, currentGraph] = findByComponent node.component, ctx.project

      if type is 'component'
        ctx.component = currentGraph
        return sendError out.out, new Error 'Component cannot have subnodes' if route.nodes.length
        break

      if type is 'runtime'
        ctx.remote.push currentGraph
        continue

      ctx.graphs.push currentGraph

    ctx.state = 'ok'
    ctx.state = 'loading' if ctx.remote.length
    out.currentgraph.send ctx.graphs[ctx.graphs.length - 1] if ctx.graphs
    out.out.send ctx

  c
