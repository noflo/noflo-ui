noflo = require 'noflo'

class DetermineRuntime extends noflo.Component
  constructor: ->
    @inPorts =
      graph: new noflo.Port 'object'
    @outPorts =
      runtime: new noflo.Port 'string'
      graph: new noflo.Port 'object'

    @inPorts.graph.on 'data', (data) =>
      @outPorts.runtime.send @determineRuntime data
      @outPorts.graph.send data
    @inPorts.graph.on 'disconnect', =>
      @outPorts.runtime.disconnect()
      @outPorts.graph.disconnect()

  determineRuntime: (graph) ->
    switch graph.properties.environment.runtime
      when 'html' then return 'iframe'
      when 'websocket' then return 'websocket'
      else return 'iframe'

exports.getComponent = -> new DetermineRuntime
