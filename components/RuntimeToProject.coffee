noflo = require 'noflo'
uuid = require 'uuid'

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
      graphs: []
      components: []
      specs: []

    graphs = data.payload.graphs.slice 0
    components = []
    components.push data.payload.component if data.payload.component

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

    # TODO: Discover components with project's namespace from runtime

    # Associate runtime with project for auto-connecting
    data.payload.runtime.definition.project = project.id
    out.runtime.send data.payload.runtime.definition

    out.project.send
      id: project.id
      name: project.name
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
