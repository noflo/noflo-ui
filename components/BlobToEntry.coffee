noflo = require 'noflo'
uuid = require 'uuid'
collections = require '../src/collections'
projects = require '../src/projects'
_ = require 'underscore'

handleGraph = (sha, content, entry, project, callback) ->
  # Start by loading the graph object
  method = 'loadJSON'
  method = 'loadFBP' if entry.remote.language is 'fbp'
  content = JSON.parse content if entry.remote.language is 'json'
  noflo.graph[method] content, (err, graph) ->
    if err
      callback new Error "Failed to load #{entry.remote.name}: #{err.message}"
      return
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
      collections.addToList project.graphs, entry.local
      callback null, entry.local
      return

    graph.properties.name = entry.remote.name
    graph.name = entry.remote.name
    graph.properties.id = uuid.v4()
    graph.properties.environment = {} unless graph.properties.environment
    graph.properties.environment.type = project.type unless graph.properties.environment.type
    collections.addToList project.graphs, graph
    callback null, graph
    do callback

handleComponent = (sha, content, entry, project, callback) ->
  if entry.local
    entry.local.code = content
    entry.local.sha = sha
    entry.local.changed = false
    collections.addToList project.components, entry.local
    callback null, entry.local
    return
  newEntry =
    id: uuid.v4()
    project: project.id
    name: entry.remote.name
    code: content
    language: entry.remote.language
    sha: sha
    changed: false
  collections.addToList project.components, newEntry
  callback null, newEntry

handleSpec = (sha, content, entry, project, callback) ->
  if entry.local
    entry.local.code = content
    entry.local.sha = sha
    entry.local.changed = false
    collections.addToList project.specs, entry.local
    callback null, entry.local
    return
  newEntry =
    id: uuid.v4()
    project: project.id
    type: 'spec'
    name: entry.remote.name
    code: content
    language: entry.remote.language
    sha: sha
    changed: false
  collections.addToList project.specs, newEntry
  callback null, newEntry

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'blob',
    datatype: 'array'
    description: 'Git blob entries'
  c.inPorts.add 'operation',
    datatype: 'object'
    description: 'Sync operation'
    required: true
  c.outPorts.add 'graph',
    datatype: 'object'
    scoped: false
  c.outPorts.add 'component',
    datatype: 'object'
    scoped: false
  c.outPorts.add 'spec',
    datatype: 'object'
    scoped: false
  c.outPorts.add 'project',
    datatype: 'object'
    scoped: false
  c.outPorts.add 'error',
    datatype: 'object'
    scoped: false

  c.forwardBrackets = {}
  c.process (input, output) ->
    return unless input.hasData 'operation'
    return unless input.hasData 'blob'
    [operation, blobs] = input.getData 'operation', 'blob'

    unless operation.pull?.length
      output.done new Error 'Operation does not provide any pull entries'
      return
    unless _.isArray blobs
      # Only one received
      blobs = [blobs]

    entities = []
    errors = []
    blobs.forEach (data) ->
      sha = data.sha
      content = data.content.replace /\s/g, ''
      content = decodeURIComponent escape atob content if data.encoding is 'base64'

      for entry in operation.pull
        continue unless entry.remote?.sha is sha
        switch entry.type
          when 'graph'
            method = handleGraph
            port = 'graph'
          when 'spec'
            method = handleSpec
            port = 'spec'
          else
            method = handleComponent
            port = 'component'
        method sha, content, entry, operation.project, (err, entity) ->
          if err
            errors.push err
            return
          entities.push
            type: port
            entity: entity
        return
      errors.push "No entry found for blob #{sha}"
      return
    if errors.length
      output.done errors[0]
      return
    for entity in entities
      res = {}
      res[entity.type] = entity.entity
      output.send res

    # Since this is a new checkout, set project main graph
    operation.project.main = projects.findMainGraph operation.project

    output.sendDone
      project: operation.project
