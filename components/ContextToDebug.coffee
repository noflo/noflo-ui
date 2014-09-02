noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'context',
    datatype: 'object'

  c.outPorts.add 'context',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'context'
    out: 'context'
    forwardGroup: true
  , (context, groups, out) ->
    c.removeListener()
    c.addListener context.runtime, context.graphs?[0]
    out.send context

  c.setRuntimeDebug = (enable) ->
    @runtime.sendNetwork 'debug',
      graph: @graph.name
      enable: enable

  c.addListener = (runtime, graph) ->
    return unless runtime? and graph?
    @runtime = runtime
    @graph = graph
    @listener = (status) =>
      return unless status.online
      @setRuntimeDebug true
    @runtime.on 'status', @listener
    @setRuntimeDebug true if @runtime.isConnected()

  c.removeListener = () ->
    return unless @listener
    # Disable debug on old runtime
    @setRuntimeDebug false if @runtime.isConnected()
    # Stop listening
    @runtime.removeListener 'status', @listener
    delete @runtime
    delete @graph

  c
