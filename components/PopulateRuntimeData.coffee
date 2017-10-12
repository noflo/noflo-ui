noflo = require 'noflo'
uuid = require 'uuid'

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
    runtime.id = runtime.id or uuid.v4()
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
    async: true
  , (route, groups, out, callback) ->
    # Match to local data
    ctx = buildContext()
    ctx.runtime = findRuntime route.runtime, c.params.runtimes
    unless ctx.runtime
      sendError out, new Error 'No runtime found'
      do callback
      return
    ctx.remote = route.nodes
    ctx.state = 'loading'
    out.send ctx
    do callback
