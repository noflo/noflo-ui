noflo = require 'noflo'
uuid = require 'uuid'

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
  return unless runtimes?.length
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
  c.outPorts.add 'new',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in', 'runtimes'
    [route, runtimes] = input.getData 'in', 'runtimes'
    unless route.runtime
      output.done new Error "No runtime defined"
      return
    if typeof route.runtime is 'string' and route.runtime.substr(0, 9) is 'endpoint?'
      # Decode URL parameters
      route.runtime = decodeRuntime route.runtime.substr 9
    # Match to local runtimes
    persistedRuntime = findRuntime route.runtime, runtimes
    unless persistedRuntime
      # This is a new runtime definition, save
      output.send
        new: route.runtime
      output.send
        out: route
      output.done()
      return
    route.runtime = persistedRuntime
    output.send
      out: route
    output.done()
