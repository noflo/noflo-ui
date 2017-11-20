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
  c.icon = 'exclamation-triangle'
  c.inPorts.add 'error',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'error'
    out: 'out'
    async: true
  , (err, groups, out, callback) ->
    ctx = buildContext()
    ctx.state = 'error'
    ctx.error = err.payload or err
    out.send ctx
    do callback
