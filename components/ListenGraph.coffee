noflo = require 'noflo'

class ListenGraph extends noflo.Component
  constructor: ->
    @inPorts =
      graph: new noflo.Port 'object'
    @outPorts =
      changed: new noflo.Port 'object'

    @inPorts.graph.on 'data', (graph) =>
      @subscribeGraph graph

  subscribeGraph: (graph) ->
    graph.on 'addNode', => @sendGraph graph
    graph.on 'removeNode', => @sendGraph graph
    graph.on 'renameNode', => @sendGraph graph
    graph.on 'addEdge', => @sendGraph graph
    graph.on 'removeEdge', => @sendGraph graph
    graph.on 'addInitial', => @sendGraph graph
    graph.on 'removeInitial', => @sendGraph graph

  sendGraph: (graph) ->
    @outPorts.changed.send graph
    @outPorts.changed.disconnect()

exports.getComponent = -> new ListenGraph
