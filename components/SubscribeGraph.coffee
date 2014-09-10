noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'context',
    datatype: 'object'
  c.outPorts.add 'runtime',
    datatype: 'object'
  c.outPorts.add 'graph',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'context'
    out: ['runtime', 'graph', 'out']
  , (data, groups, out) ->
    if data.runtime
      out.runtime.send data.runtime
    if data.graphs?.length
      out.graph.send data.graphs[data.graphs.length - 1]
    out.out.send data

  c
