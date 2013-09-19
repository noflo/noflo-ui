noflo = require 'noflo'

class LoadGraph extends noflo.AsyncComponent
  constructor: ->
    @basedir = ''
    @inPorts =
      in: new noflo.Port 'object'
      basedir: new noflo.Port 'string'
    @outPorts =
      out: new noflo.Port 'object'

    @inPorts.basedir.on 'data', (@basedir) =>

    super()

  doAsync: (graphDefinition, done) ->
    noflo.graph.loadJSON graphDefinition, (graph) =>
      graph.baseDir = @basedir
      @outPorts.out.send graph
      @outPorts.out.disconnect()
      done()

exports.getComponent = -> new LoadGraph
