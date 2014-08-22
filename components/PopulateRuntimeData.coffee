noflo = require 'noflo'

buildContext = ->
  ctx =
    state: ''
    project: null
    runtime: null
    component: null
    graphs: []
    remote: []

sendError = (out) ->
  ctx = buildContext()
  ctx.state = 'error'
  out.send ctx

findRuntime = (id, runtimes) ->
  return unless runtimes
  for runtime in runtimes
    return runtime if runtime.id is id
  return null

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'runtimes',
    required: true
    datatype: 'array'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    params: ['runtimes']
    out: 'out'
  , (route, groups, out) ->
    # Match to local data
    ctx = buildContext()
    ctx.runtime = findRuntime route.runtime, c.params.runtimes
    return sendError out unless ctx.runtime
    ctx.remote = route.nodes
    ctx.state = 'loading'
    out.send ctx
    
  c
