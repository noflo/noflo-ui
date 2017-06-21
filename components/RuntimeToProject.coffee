noflo = require 'noflo'
uuid = require 'uuid'
url = require 'url'
path = require 'path'

isComponentInProject = (namespace, componentName) ->
  return true if componentName.indexOf('/') is -1
  [library, component] = componentName.split '/'
  return library is namespace

fetchSources = (components, runtime, sources, callback) ->
  return callback null, sources unless components.length
  handleMessage = (msg) ->
    if msg.command is 'error'
      callback new Error msg.payload.message
      return
    if msg.command is 'source'
      sources.push msg.payload
      fetchSources components, runtime, sources, callback
      return
    # We got unrelated message, subscribe again
    runtime.once 'component', handleMessage
  runtime.once 'component', handleMessage
  component = components.shift()
  runtime.sendComponent 'getsource',
    name: component

fetchFromLibrary = (namespace, runtime, callback) ->
  return callback null, [] unless namespace
  return callback null, [] unless runtime.isConnected()
  return callback null, [] unless runtime.canDo 'component:getsource'
  return callback null, [] unless runtime.definition.components
  components = Object.keys(runtime.definition.components).filter (componentName) ->
    isComponentInProject namespace, componentName
  fetchSources components, runtime, [], callback

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'project',
    datatype: 'object'
  c.outPorts.add 'graph',
    datatype: 'object'
  c.outPorts.add 'component',
    datatype: 'object'
  c.outPorts.add 'runtime',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    out: ['project', 'graph', 'component', 'runtime']
    forwardGroups: false
    async: true
  , (data, groups, out, callback) ->
    project =
      id: uuid.v4()
      namespace: data.payload.runtime?.definition?.namespace
      graphs: []
      components: []
      specs: []
    project.name = project.namespace if project.namespace

    if data.payload.runtime?.definition?.repository and typeof data.payload.runtime.definition.repository is 'string'
      parsed = url.parse data.payload.runtime.definition.repository
      if parsed.hostname is 'github.com' and parsed.pathname
        pathname = parsed.pathname.slice 1
        org = path.dirname pathname
        repo = path.basename pathname, path.extname pathname
        project.repo = "#{org}/#{repo}"
        project.name = project.repo
    if data.payload.runtime?.definition?.repositoryVersion
      project.branch = data.payload.runtime.definition.repositoryVersion

    # Start with the data we already have
    graphs = data.payload.graphs.slice 0
    components = []
    components.push data.payload.component if data.payload.component

    # Add components and graphs from library
    fetchFromLibrary project.namespace, data.payload.runtime, (err, sources) ->
      return callback err if err
      projectGraphs = sources.filter (c) -> c.language is 'json'
      for graphDef in projectGraphs
        noflo.graph.loadJSON graphDef, (err, graph) ->
          return if err
          graphs.push graph

      components = components.concat sources.filter (c) -> c.language isnt 'json'

      for graph in graphs
        graph.name = graph.name.split('/').pop()
        graph.setProperties
          id: "#{project.id}/#{graph.properties?.id or graph.name}"
          project: project.id
        project.main = graph.properties.id unless project.main
        project.name = graph.name unless project.name
        if graph.properties?.environment?.type and not project.type
          project.type = graph.properties.environment.type
        project.graphs.push graph

      for component in components
        component.project = project.id
        project.components.push component

      # Associate runtime with project for auto-connecting
      data.payload.runtime.definition.project = project.id
      unless data.payload.runtime.definition.label
        data.payload.runtime.definition.label = "#{project.name} runtime"
      out.runtime.send data.payload.runtime.definition

      out.project.send project

      for graph in project.graphs
        out.graph.send graph
      for component in project.components
        out.component.send component

      do callback
