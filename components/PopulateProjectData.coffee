noflo = require 'noflo'

findProject = (id, projects) ->
  return unless projects
  for project in projects
    return project if project.id is id
  return null

findGraph = (id, project) ->
  return unless project.graphs
  for graph in project.graphs
    return graph if graph.properties?.name is id
    return graph if graph.id is id
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
    in: 'in'
    out: 'out'
    async: true
  , (data, groups, out, callback) ->
    unless data.state.projects?.local
      callback new Error "No projects found"
      return
    project = findProject data.payload.project, data.state.projects.local
    unless project
      callback new Error "Project #{data.payload.project} not found"
      return
    data.payload.project = project

    if data.payload.component
      component = findComponent data.payload.component, project
      unless component
        callback new Error "Project #{data.payload.project.id} graph #{data.payload.component} not found"
        return
      data.payload.graphs = []
      data.payload.component = component
      out.send data
      return callback()

    unless data.payload.graph
      data.payload.graph = project.main

    mainGraph = findGraph data.payload.graph, project
    unless mainGraph
      callback new Error "Graph #{data.payload.graph} not found"
      return
    data.payload.graphs = [mainGraph]
    delete data.payload.graph

    currentGraph = mainGraph
    while data.payload.nodes.length
      # Traverse node tree as far as we can fill it
      # from local data
      nodeId = data.payload.nodes[0]
      node = currentGraph.processes[nodeId]
      return callback new Error "Node #{nodeId} not found" unless node
      return callback new Error "Node #{nodeId} has no component defined" unless node.component
      [type, currentGraph] = findByComponent node.component, project
      if type is 'runtime'
        # This node can't be found locally, let
        # runtime provide it
        break

      if type is 'component'
        data.payload.component = currentGraph
        data.payload.nodes.shift()
        return callback new Error 'Component cannot have subnodes' if data.payload.nodes.length
        break

      data.payload.graphs.push currentGraph
      data.payload.nodes.shift()

    out.send data
    callback()
    return
