noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    async: true
  , (data, groups, out, callback) ->
    newState =
      workspace: data.state.workspace
    newState.workspace.project = data.payload.project
    newState.workspace.graphs = data.payload.graphs
    newState.workspace.component = data.payload.component

    unless newState.workspace.graphs?.length
      out.send newState
      do callback
      return

    # Convert graph to noflo.Graph object for the-graph
    currentGraph = newState.workspace.graphs[newState.workspace.graphs.length - 1]
    noflo.graph.loadJSON currentGraph, (err, graph) ->
      return callback err if err
      newState.workspace.graph = graph
    out.send newState
    do callback
