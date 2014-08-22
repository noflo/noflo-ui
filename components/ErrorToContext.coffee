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
  c.inPorts.add 'error',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'error'
    out: 'out'
  , (err, groups, out) ->
    ctx = buildContext()
    ctx.state = 'error'
    ctx.error = err
    out.send ctx

  c
