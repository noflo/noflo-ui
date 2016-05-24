noflo = require 'noflo'

# @runtime noflo-browser

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
    c.removeListener context
    c.addListener context.runtime, context.graphs?[0]
    out.send context

  c.setRuntimeDebug = (enable) ->
    return unless c.runtime.canDo 'protocol:network'
    c.runtime.sendNetwork 'debug',
      graph: @graphId
      enable: enable

  graphId = (graph) ->
    id = graph.name or graph.properties.id
    if graph.properties.library
      return "#{graph.properties.library}/#{id}"
    id

  c.addListener = (runtime, graph) ->
    return unless runtime? and graph?
    @runtime = runtime
    @graph = graph
    @graphId = graphId graph
    @listener = (status) ->
      return unless status.online
      c.setRuntimeDebug true
    @runtime.on 'capabilities', c.listener
    @setRuntimeDebug true if @runtime.isConnected()

  c.removeListener = (newContext) ->
    return unless @listener and @runtime
    # Disable debug on old runtime
    @setRuntimeDebug false if @runtime.isConnected() and @runtime isnt newContext.runtime
    # Stop listening
    @runtime.removeListener 'capabilities', @listener
    delete c.runtime
    delete c.graph

  c
