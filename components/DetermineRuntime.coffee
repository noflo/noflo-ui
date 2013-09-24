noflo = require 'noflo'

class DetermineRuntime extends noflo.Component
  constructor: ->
    @inPorts =
      graph: new noflo.Port 'object'
    @outPorts =
      runtime: new noflo.Port 'string'
      graph: new noflo.Port 'object'

    @inPorts.graph.on 'data', (data) =>
      graph = @normalizeGraph data
      @outPorts.runtime.send @determineRuntime graph
      @outPorts.graph.send graph
    @inPorts.graph.on 'disconnect', =>
      @outPorts.runtime.disconnect()
      @outPorts.graph.disconnect()

  normalizeGraph: (graph) ->
    unless graph.properties.environment
      graph.properties.environment =
        runtime: 'html'
    graph

  determineRuntime: (graph) ->
    switch graph.properties.environment.runtime
      when 'html' then return 'iframe'
      when 'websocket' then return 'websocket'
      else return 'iframe'

exports.getComponent = -> new DetermineRuntime
