noflo = require 'noflo'

getGraphType = (graph) ->
  return null unless graph.properties.environment
  if not graph.properties.environment.type and graph.properties.environment.runtime is 'html'
    graph.properties.environment.type = 'noflo-browser'
  graph.properties.environment.type

getComponentType = (component) ->
  return null unless component.code
  runtimeType = component.code.match /@runtime ([a-z\-]+)/
  return null unless runtimeType
  return runtimeType[1]

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
  c.outPorts.add 'context',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'context'
    out: 'context'
  , (ctx, groups, out) ->
    rts = ctx.runtimes or []
    unless ctx.graphs?.length
      unless ctx.component
        out.send ctx
        return
      componentType = getComponentType ctx.component
      unless componentType
        out.send ctx
        return
      ctx.compatibleRuntimes = findCompatible componentType, rts
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
