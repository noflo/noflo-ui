noflo = require 'noflo'

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

    ctx.compatibleRuntimes = rts.filter (rt) ->
      return true if ctx.graphs[0].properties.environment.type is 'all'
      return true if ctx.graphs[0].properties.environment.type is rt.type
      false

    out.send ctx

  c
