noflo = require 'noflo'
uuid = require 'uuid'

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

    # Start with the data we already have
    graphs = data.payload.graphs.slice 0
    components = []
    components.push data.payload.component if data.payload.component

    # Add components and graphs from library
    fetchFromLibrary project.namespace, data.payload.runtime, (err, sources) ->
      return callback err if err
      graphs = graphs.concat sources.filter (c) -> c.language is 'json'
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
        out.graph.send graph

      for component in components
        component.project = project.id
        project.components.push component
        out.component.send component

      # Associate runtime with project for auto-connecting
      data.payload.runtime.definition.project = project.id
      out.runtime.send data.payload.runtime.definition

      out.project.send
        id: project.id
        name: project.name
        namespace: project.namespace
        type: project.type
        main: project.main

      # FIXME: Do in reducer
      data.state.projects.push project
      foundRuntime = data.state.runtimes.filter (rt) ->
        rt.id is data.payload.runtime.definition.id
      if foundRuntime.length
        foundRuntime[0].project = project.id
      else
        data.state.runtimes.push data.payload.runtime.definition

      # FIXME: Make an action
      window.location.hash = "#project/#{encodeURIComponent(project.id)}/#{encodeURIComponent(project.main)}"

      do callback
