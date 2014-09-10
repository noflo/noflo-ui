noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'nodes',
    datatype: 'array'
  c.outPorts.add 'context',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'nodes'
    out: 'context'
  , (nodes, groups, out) ->
    ctx =
      searchGraphResult: nodes
    out.send ctx

  c
