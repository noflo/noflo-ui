noflo = require 'noflo'

getGraphType = (graph) ->
  if not graph.properties.environment.type and graph.properties.environment.runtime is 'html'
    graph.properties.environment.type = 'noflo-browser'
  graph.properties.environment.type

findCompatible = (graphType, rts) ->
  return [] unless graphType
  compatibleRuntimes = rts.filter (rt) ->
    return false unless rt.type
    return true if graphType is 'all'
    return true if graphType is rt.type
    false
  compatibleRuntimes

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'context',
    datatype: 'object'
  c.inPorts.add 'runtimes',
    datatype: 'array'
    required: true
  c.outPorts.add 'context',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'context'
    params: 'runtimes'
    out: 'context'
  , (ctx, groups, out) ->
    rts = c.params?.runtimes or []
    unless ctx.graphs?.length
      out.send ctx
      return

    graph = ctx.graphs[0]
    graphType = getGraphType ctx.graphs[0]
    ctx.compatibleRuntimes = findCompatible graphType, rts
    out.send ctx

    graph.on 'changeProperties', ->
      newGraphType = getGraphType graph
      return if newGraphType is graphType
      graphType = newGraphType
      ctx.compatibleRuntimes = findCompatible graphType, rts
      out.send ctx

  c
