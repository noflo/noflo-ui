noflo = require 'noflo'

class CreateGraph extends noflo.Component
  constructor: ->
    @inPorts =
      details: new noflo.Port 'string'
    @outPorts =
      out: new noflo.Port 'object'

    @inPorts.details.on 'data', (details) =>
      graph = new noflo.Graph details.name
      graph.properties.environment =
        runtime: details.type
      @outPorts.out.send graph
    @inPorts.details.on 'disconnect', =>
      @outPorts.out.disconnect()

exports.getComponent = -> new CreateGraph
