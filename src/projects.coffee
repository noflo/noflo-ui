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
  callback null, [
    'project'
    project.id
    main
  ]
  return
