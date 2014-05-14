noflo = require 'noflo'

class GetNode extends noflo.Component
  constructor: ->
    @projects = []
    @inPorts = new noflo.InPorts
      route:
        datatype: 'object'
        description: 'A route object'
      projects:
        datatype: 'array'
        description: 'Set of NoFlo UI projects'
    @outPorts = new noflo.OutPorts
      project:
        datatype: 'object'
      graph:
        datatype: 'object'
      component:
        datatype: 'object'
      example:
        datatype: 'string'
      runtime:
        datatype: 'string'

    @inPorts.projects.on 'data', (@projects) =>
    @inPorts.route.on 'data', (route) =>
      @getNodes route
    @inPorts.route.on 'disconnect', =>
      @outPorts.project.disconnect()
      @outPorts.graph.disconnect()
      @outPorts.component.disconnect()
      @outPorts.runtime.disconnect()
      @outPorts.example.disconnect()

  getGraph: (project, id) ->
    return unless project.graphs
    for graph in project.graphs
      return graph if graph.properties.id is id

  getComponent: (project, id) ->
    return unless project.components
    for component in project.components
      return component if component.name is id

  getByComponent: (project, componentName) ->
    [library, name] = componentName.split '/'

    unless name
      name = library
      library = undefined

    graph = @getGraph project, name
    return ['graph', graph] if graph

    component = @getComponent project, name
    return ['component', component] if component

    # Get from runtime
    return ['runtime', componentName]

  findLocal: (project, route) ->
    if route.route is 'component'
      component = @getComponent project, route.component
      return unless component
      @outPorts.component.send component
      return

    # Top-level graph is identified by ID
    currentGraph = @getGraph project, route.graph
    return unless currentGraph
    @outPorts.graph.send currentGraph

    while route.nodes.length
      nodeId = decodeURIComponent route.nodes.shift()
      currentNode = currentGraph.getNode nodeId
      return unless currentNode and currentNode.component
      [type, currentGraph] = @getByComponent project, currentNode.component
      return unless currentGraph

      if type is 'component'
        @outPorts.component.send currentGraph
        return
      if type is 'runtime'
        @outPorts.runtime.send currentGraph
        return

      @outPorts.graph.send currentGraph

  getNodes: (route) ->
    @outPorts.component.send null
    switch route.route
      when 'main'
        @outPorts.project.send null
        return
      when 'example'
        @outPorts.project.send null
        @outPorts.example.send route.graphs[0]
        return

    return unless route.project
    return unless @projects.length
    project = null
    for p in @projects
      project = p if p.id is decodeURIComponent route.project
    return unless project
    @outPorts.project.send project

    @findLocal project, route

exports.getComponent = -> new GetNode
