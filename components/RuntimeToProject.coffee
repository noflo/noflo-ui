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
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    out: ['project', 'graph', 'component']
    forwardGroups: false
    async: true
  , (data, groups, out, callback) ->
    console.log data.state
    project =
      id: uuid.v4()
      graphs: []
      components: []
      specs: []

    for graph in data.payload.graphs
      graph.setProperties
        id: "#{project.id}/#{graph.properties?.id or graph.name}"
        project: project.id
      project.main = graph.properties.id unless project.main
      project.name = graph.name unless project.name
      if graph.properties?.environment?.type and not project.type
        project.type = graph.properties.environment.type
      project.graphs.push graph
      out.graph.send graph

    if data.payload.component
      data.payload.component.project = project.id
      project.components.push data.payload.component
      out.component.send data.payload.component

    # TODO: Discover components with project's namespace from runtime

    out.project.send
      id: project.id
      name: project.name
      type: project.type
      main: project.main

    # FIXME: Do in reducer
    data.state.projects.push project

    # FIXME: Make an action
    window.location.hash = "#project/#{encodeURIComponent(project.id)}/#{encodeURIComponent(project.main)}"

    do callback
