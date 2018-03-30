noflo = require 'noflo'
{ getGraphType, getComponentType, isDefaultRuntime } = require '../src/runtime'

getType = (context) ->
  if context.graphs.length
    # Current main graph in view
    graphType = getGraphType context.graphs[0]
    return graphType if graphType
  if context.component
    # Current component in editor
    componentType = getComponentType context.component
    return componentType if componentType
  return null unless context.project
  return context.project.type

findCompatibleRuntimes = (context, runtimes) ->
  projectType = getType context
  return runtimes.filter (rt) ->
    return true if projectType is 'all'
    return rt.type is projectType

findCurrentRuntime = (context, runtimes) ->
  # TODO: Switch runtime if no longer in list of compatible
  return context.runtime if context.runtime
  return null unless runtimes.length
  [matched] = runtimes.filter (rt) ->
    if context.project and rt.project
      return true if isDefaultRuntime rt
      return false if rt.project isnt context.project.id
    return true if context.project and rt.project is context.project.id
    return true if rt.protocol is 'iframe'
    false
  return matched or null

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'runtimes',
    datatype: 'array'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'skipped',
    datatype: 'object'

  c.process (input, output) ->
    return unless input.hasData 'in', 'runtimes'
    [context, runtimes] = input.getData 'in', 'runtimes'

    context.compatible = findCompatibleRuntimes context, runtimes
    context.runtime = findCurrentRuntime context, context.compatible

    unless context.runtime
      # No runtime matched, send as-is
      output.sendDone
        skipped: context
      return

    output.sendDone
      out: context
    return
