noflo = require 'noflo'

findRuntime = (context) ->
  return context.runtime if context.runtime
  return null unless context.graphs?.length
  return null unless context.compatibleRuntimes?.length
  fallbackRt = null
  for rt in context.compatibleRuntimes
    fallbackRt = rt if rt.protocol is 'iframe'
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
  c.outPorts.add 'connect',
    datatype: 'object'
  c.outPorts.add 'context',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'context'
    params: 'runtime'
    out: ['connect', 'context']
  , (context, groups, out) ->
    if not context.graphs?.length and not context.remote?.length
      out.context.send context
      return
    context.runtime = findRuntime context
    if context.runtime
      # Already connected
      if c.params.runtime?.definition.id is context.runtime.id
        context.runtime = c.params.runtime
        out.context.send context
        return
      # No matching active runtime connection, we need to connect
      return out.connect.send context

    # No chosen runtime, present option to user
    out.context.send context

  c
