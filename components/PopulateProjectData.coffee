noflo = require 'noflo'

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
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    params: ['projects']
    out: 'out'
    async: true
  , (data, groups, out, callback) ->
    project = findProject data.project, c.params.projects.local
    unless project
      callback new Error "Project #{data.project} not found"
      return
    data.project = project

    if data.component
      component = findComponent data.component, project
      unless component
        callback new Error "Project #{data.project.id} graph #{data.component} not found"
        return
      out.send data
      return callback()

    unless data.graph
      data.graph = project.main

    mainGraph = findGraph data.graph, project
    unless mainGraph
      callback new Error "Graph #{data.graph} not found"
      return
    data.graphs = [mainGraph]
    delete data.graph

    currentGraph = mainGraph
    while data.nodes.length
      # Traverse node tree as far as we can fill it
      # from local data
      nodeId = route.nodes[0]
      node = currentGraph.getNode nodeId
      return callback new Error "Node #{nodeId} not found" unless node
      return callback new Error "Node #{nodeId} has no component defined" unless node.component
      [type, currentGraph] = findByComponent node.component, project
      if type is 'runtime'
        # This node can't be found locally, let
        # runtime provide it
        break

      if type is 'component'
        data.component = currentGraph
        return callback new Error 'Component cannot have subnodes' if route.nodes.length
        break

      data.graphs.push currentGraph
      route.nodes.shift()

    out.send data
    return
