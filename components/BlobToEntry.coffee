noflo = require 'noflo'

generateId = (project, entry) ->
  id = "#{project.id}/#{entry.path.substr(0, entry.path.lastIndexOf('.'))}"
  id.replace /[\/\s\.]/g, '_'

handleGraph = (sha, content, entry, project, out, callback) ->
  # Start by loading the graph object
  method = 'loadJSON'
  method = 'loadFBP' if entry.remote.language is 'fbp'
  content = JSON.parse content if entry.remote.language is 'json'
  noflo.graph[method] content, (err, graph) ->
    return callback err if err
    # Properties that need to be changed for both cases
    graph.properties = {} unless graph.properties
    graph.properties.sha = sha
    graph.properties.changed = false
    graph.properties.project = project.id

    if entry.local
      entry.local.startTransaction sha
      noflo.graph.mergeResolveTheirs entry.local, graph
      entry.local.endTransaction sha
      # Ensure the graph is marked as not changed since SHA
      entry.local.properties.changed = false
      out.send entry.local
      do callback
      return

    graph.properties.name = entry.remote.name
    graph.name = entry.remote.name
    graph.properties.id = generateId project, entry
    graph.properties.environment = {} unless graph.properties.environment
    graph.properties.environment.type = project.type unless graph.properties.environment.type
    project.graphs.push graph
    out.send graph
    do callback

handleComponent = (sha, content, entry, project, out, callback) ->
  if entry.local
    entry.local.code = content
    entry.local.sha = sha
    entry.local.changed = false
    out.send entry.local
    do callback
    return
  newEntry =
    id: generateId project, entry
    project: project.id
    name: entry.remote.name
    code: content
    language: entry.remote.language
    sha: sha
    changed: false
  project.components.push newEntry
  out.send newEntry
  do callback

handleSpec = (sha, content, entry, project, out, callback) ->
  if entry.local
    entry.local.code = content
    entry.local.sha = sha
    entry.local.changed = false
    out.send entry.local
    do callback
    return
  newEntry =
    id: generateId project, entry
    project: project.id
    type: 'spec'
    name: entry.remote.name
    code: content
    language: entry.remote.language
    sha: sha
    changed: false
  project.specs.push newEntry
  out.send newEntry
  do callback

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'blob',
    datatype: 'object'
    description: 'Git blob entry'
  c.inPorts.add 'operation',
    datatype: 'object'
    description: 'Sync operation'
    required: true
  c.outPorts.add 'graph',
    datatype: 'object'
  c.outPorts.add 'component',
    datatype: 'object'
  c.outPorts.add 'spec',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'blob'
    params: 'operation'
    out: ['graph', 'component', 'spec']
    async: true
  , (data, groups, out, callback) ->
    sha = data.sha
    content = data.content.replace /\s/g, ''
    content = decodeURIComponent escape atob content if data.encoding is 'base64'

    unless c.params.operation.pull?.length
      return callback new Error 'Operation does not provide any pull entries'

    for entry in c.params.operation.pull
      continue unless entry.remote?.sha is sha
      try
        if entry.type is 'graph'
          return handleGraph sha, content, entry, c.params.operation.project, out.graph, callback
        if entry.type is 'spec'
          return handleSpec sha, content, entry, c.params.operation.project, out.spec, callback
        return handleComponent sha, content, entry, c.params.operation.project, out.component, callback
      catch e
        return callback e

    callback new Error "No entry found for #{groups[groups.length - 2]} blob #{sha}"
