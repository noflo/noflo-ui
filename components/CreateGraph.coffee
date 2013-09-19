noflo = require 'noflo'

class CreateGraph extends noflo.Component
  constructor: ->
    @baseDir = ''
    @inPorts =
      name: new noflo.Port 'string'
      basedir: new noflo.Port 'string'
    @outPorts =
      out: new noflo.Port 'object'

    @inPorts.name.on 'data', (name) =>
      graph = new noflo.Graph name
      graph.baseDir = @baseDir
      @outPorts.out.send graph
    @inPorts.name.on 'disconnect', =>
      @outPorts.out.disconnect()

    @inPorts.basedir.on 'data', (@baseDir) =>

exports.getComponent = -> new CreateGraph
