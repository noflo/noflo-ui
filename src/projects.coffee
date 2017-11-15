exports.findMainGraph = (project) ->
  return null unless project.graphs.length
  if project.main
    # Ensure currently set main graph exists
    for graph in project.graphs
      return project.main if graph.properties.id is project.main
  # No 'main' graph sent, see if we can make a smart choice
  for graph in project.graphs
    return graph.properties.id if graph.name is 'main'
    return graph.properties.id if graph.properties.main
  return null

exports.getProjectHash = (project, callback) ->
  unless project.graphs.length
    if project.components.length
      # No graphs in this project, but there are components
      callback null, [
        'project'
        project.id
        'component'
        project.components[0].name
      ]
      return
    setTimeout ->
      # Wait for graphs to be populated
      if not project.graphs.length and not project.components.length
        return callback new Error "Project #{project.id} has no graphs or components"
      exports.getProjectHash project, callback
    , 100
    return
  # Open main graph, or the first graph
  main = project.main or project.graphs[0].properties.id
  unless main
    return callback new Error "Unable find a main graph for project #{project.id}"
  callback null, [
    'project'
    project.id
    main
  ]
  return
