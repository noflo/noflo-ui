noflo = require 'noflo'

findRuntime = (context) ->
  return context.runtime if context.runtime
  return null if not context.graphs?.length and not context.component
  return null unless context.compatibleRuntimes?.length
  fallbackRt = null
  for rt in context.compatibleRuntimes
    fallbackRt = rt if rt.protocol is 'iframe'
    if context.component
      return rt if rt.project and rt.project is context.component.project
    if context.graphs?.length
      return rt if rt.project and rt.project is context.graphs[0].properties.project
      # Find runtime where the current graph was set
      return rt if rt.graph is context.graphs[0].properties.id
  return fallbackRt

exports.getComponent = ->
  c = new noflo.Component
  c.runtime = null
  c.inPorts.add 'context',
    datatype: 'object'
  c.inPorts.add 'runtime',
    datatype: 'object'
    required: false
  c.inPorts.add 'requiregraphs',
    datatype: 'boolean'
    required: true
  c.outPorts.add 'connect',
    datatype: 'object'
  c.outPorts.add 'context',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'context'
    params: ['runtime', 'requiregraphs']
    out: ['connect', 'context']
  , (context, groups, out) ->
    requireGraphs = String(c.params.requiregraphs) is 'true'
    if requireGraphs and not context.graphs?.length and not context.remote?.length and not context.component
      if not context.runtime or context.runtime.canDo
        out.context.send context
        return
    context.runtime = findRuntime context
    if context.runtime
      if c.params.runtime?.canDo and c.params.runtime?.definition.id is context.runtime.id
        # Already connected
        context.runtime = c.params.runtime
        out.context.send context
        return
      # No matching active runtime connection, we need to connect
      return out.connect.send context

    # No chosen runtime, present option to user
    out.context.send context

  c
