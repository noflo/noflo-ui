noflo = require 'noflo'

buildContext = ->
  ctx =
    state: ''
    project: null
    runtime: null
    component: null
    graphs: []
    remote: []

sendError = (out) ->
  ctx = buildContext()
  ctx.state = 'error'
  out.send ctx

findProject = (id, projects) ->
  return unless projects
  for project in projects
    return project if project.id is id
  return null

findGraph = (id, project) ->
  return unless project.graphs
  for graph in project.graphs
    return graph if graph.properties.id is id
  return null

findComponent = (name, project) ->
  return unless project.components
  for component in project.components
    return component if component.name is name
  return null

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'projects',
    required: true
    datatype: 'array'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    params: ['projects']
    out: 'out'
  , (route, groups, out) ->
    # Send the 'loading' ctx
    initial = buildContext()
    initial.state = 'loading'
    c.outPorts.out.send initial

    # Match to local data
    ctx = buildContext()
    ctx.project = findProject route.project, c.params.projects
    return sendError out unless ctx.project

    if route.component
      ctx.component = findComponent route.component, ctx.project
      return sendError out unless ctx.component
      ctx.state = 'ok'
      out.send ctx
      return

    mainGraph = findGraph route.graph, ctx.project
    return sendError out unless mainGraph
    ctx.graphs.push mainGraph

    # TODO: Handle subnodes

    ctx.state = 'ok'
    out.send ctx

  c
