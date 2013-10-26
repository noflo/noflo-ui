noflo = require 'noflo'

class CreateGraph extends noflo.Component
  constructor: ->
    @baseDir = ''
    @runtime = 'html'
    @inPorts =
      name: new noflo.Port 'string'
      basedir: new noflo.Port 'string'
      runtime: new noflo.Port 'string'
    @outPorts =
      out: new noflo.Port 'object'

    @inPorts.name.on 'data', (name) =>
      graph = new noflo.Graph name
      graph.baseDir = @baseDir
      if graph.properties.environment
        graph.properties.environment.runtime = @runtime
      else
        graph.properties.environment =
            runtime: @runtime
      @outPorts.out.send graph
    @inPorts.name.on 'disconnect', =>
      @outPorts.out.disconnect()

    @inPorts.basedir.on 'data', (@baseDir) =>
    @inPorts.runtime.on 'data', (@runtime) =>

exports.getComponent = -> new CreateGraph
