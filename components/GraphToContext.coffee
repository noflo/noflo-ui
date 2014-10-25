noflo = require 'noflo'

buildContext = ->
  ctx =
    state: ''
    project: null
    runtime: null
    component: null
    graphs: []
    remote: []

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'graph',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'graph'
    params: 'context'
    out: 'out'
  , (data, groups, out) ->
    ctx = buildContext()
    ctx.state = 'ok'
    ctx.graphs.push data
    out.send ctx

  c
