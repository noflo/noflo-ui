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
    c.runtime.sendNetwork 'debug',
      graph: c.graph.name
      enable: enable

  c.addListener = (runtime, graph) ->
    return unless runtime? and graph?
    c.runtime = runtime
    c.graph = graph
    c.listener = (status) =>
      return unless status.online
      c.setRuntimeDebug true
    c.runtime.on 'status', c.listener
    c.setRuntimeDebug true if c.runtime.isConnected()

  c.removeListener = ->
    return unless c.listener
    # Disable debug on old runtime
    c.setRuntimeDebug false if c.runtime.isConnected()
    # Stop listening
    c.runtime.removeListener 'status', c.listener
    delete c.runtime
    delete c.graph

  c
