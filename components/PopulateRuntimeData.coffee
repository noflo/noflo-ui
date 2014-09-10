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

decodeRuntime = (data) ->
  runtime = {}
  data.split('&').forEach (param) ->
    [key, value] = param.split '='
    runtime[key] = value
  if runtime.protocol and runtime.address
    runtime.id = encodeURIComponent runtime.address
    return runtime
  null

findRuntime = (id, runtimes) ->
  if typeof id is 'string' and  id.substr(0, 9) is 'endpoint?'
    return decodeRuntime id.substr 9
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
    return sendError out, new Error 'No runtime found'  unless ctx.runtime
    ctx.remote = route.nodes
    ctx.state = 'loading'
    out.send ctx
    
  c
