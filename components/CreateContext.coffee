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
  c.inPorts.add 'start',
    datatype: 'bang'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'start'
    out: 'out'
  , (data, groups, out) ->
    ctx = buildContext()
    ctx.state = 'ok'
    out.send ctx

  c
