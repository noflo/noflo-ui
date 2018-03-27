fbpGraph = require 'fbp-graph'

portForLibrary = (port) ->
  definition =
    name: port.id
    type: port.type
    description: port.type
    addressable: port.addressable
    schema: port.schema
  return definition

# Covert FBP Protocol component to the-graph library component
exports.componentForLibrary = (component) ->
  definition =
    name: component.name
    icon: component.icon or 'cog'
    description: component.description or ''
    subgraph: component.subgraph
    inports: component.inPorts.map portForLibrary
    outports: component.outPorts.map portForLibrary

exports.getGraphType = (graph) ->
  if not graph.properties.environment?.type and graph.properties.environment?.runtime is 'html'
    # Legacy noflo-browser
    graph.properties.environment.type = 'noflo-browser'
  if graph.properties.environment?.type
    return graph.properties.environment.type
  return null

exports.getComponentType = (component) ->
  runtimeType = component.code.match /@runtime ([a-z\-]+)/
  if runtimeType
    return runtimeType[1]
  return null

exports.getRemoteNodes = (client, route) ->
  return route.remote.reduce(((promise, node) ->
    promise.then (graph) ->
      unless graph.nodes?.length
        return Promise.reject new Error "Node #{graph.name} doesn't contain child nodes"
      [matchedNode] = graph.nodes.filter (n) -> n.id is node
      unless matchedNode
        return Promise.reject new Error "Node #{node} not found in graph #{graph.name or graph.properties.id}"
      return client.protocol.component.getsource(
        name: matchedNode.component
      )
      .then((source) -> new Promise (resolve, reject) ->
        if source.language not in ['json', 'fbp']
          route.component = source
          resolve(source)
          return
        method = if source.language is 'json' then 'loadJSON' else 'loadFBP'
        fbpGraph.graph[method] source.code, (err, instance) ->
          if err
            reject err
            return
          route.graphs.push = instance
          resolve instance
          return
      )
  ), Promise.resolve(route.graphs[route.graphs.length - 1]))
  .then(() ->
    route.remote = []
    return route
  )
