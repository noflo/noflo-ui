noflo = require 'noflo'

buildContext = ->
  ctx =
    state: ''
    project: null
    runtime: null
    component: null
    graphs: []
    remote: []

sendError = (out, err) ->
  ctx = buildContext()
  ctx.state = 'error'
  ctx.error = err
  out.send ctx

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'graph',
    datatype: 'object'
  c.inPorts.add 'context',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: ['graph', 'context']
    out: 'out'
  , (data, groups, out) ->
    ctx = buildContext()
    ctx.state = 'ok'
    ctx.graphs.push data.graph
    unless data.context.remote?.length
      out.send ctx
      return

    node = data.graph.getNode data.context.remote[0]
    unless node
      c.error new Error "Node #{data.context.remote[0]} not found"
      return
    data.context.remote[0] = node.component
    ctx.remote = data.context.remote
    out.send ctx

  c
