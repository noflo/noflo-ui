noflo = require 'noflo'
{ getGraphType, getComponentType } = require '../src/runtime'

getType = (project) ->
  if project.graphs.length
    graphType = getGraphType project.graphs[0]
    return graphType if graphType
  if project.component
    componentType = getComponentType project.component
    return componentType if componentType
  return project.type

findCompatibleRuntimes = (project, runtimes) ->
  projectType = getType project
  return runtimes.filter (rt) ->
    return true if projectType is 'all'
    return rt.type is projectType

findCurrentRuntime = (project, runtimes) ->
  return project.runtime if project.runtime
  return null unless runtimes.length
  [matched] = runtimes.filter (rt) ->
    return true if rt.project is project.id
    return true if rt.protocol is 'iframe'
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
    [project, runtimes] = input.getData 'in', 'runtimes'

    project.compatible = findCompatibleRuntimes project, runtimes
    project.runtime = findCurrentRuntime project, project.compatible

    unless project.runtime
      # No runtime matched, send as-is
      output.sendDone
        skipped: project
      return

    output.sendDone
      out: project
    return
