noflo = require 'noflo'

class LoadRuntime extends noflo.Component
  constructor: ->
    @runtime = null
    @graph = null

    @inPorts =
      graph: new noflo.Port 'object'
      runtime: new noflo.Port 'string'
    @outPorts =
      graph: new noflo.Port 'object'
      runtime: new noflo.Port 'object'

    @inPorts.runtime.on 'data', (@runtime) =>
      do @loadRuntime
    @inPorts.graph.on 'data', (@graph) =>
      do @loadRuntime

  loadRuntime: (runtime) ->
    return unless @graph and @runtime
    Runtime = require "../src/runtimes/#{@runtime}"
    runtime = new Runtime @graph
    @outPorts.runtime.send runtime
    @outPorts.runtime.disconnect()
    @outPorts.graph.send @graph
    @outPorts.graph.disconnect()

    # Reset state
    @graph = null
    @runtime = null

exports.getComponent = -> new LoadRuntime
