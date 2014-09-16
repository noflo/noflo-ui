noflo = require 'noflo'
uuid = require 'uuid'

microflo = require 'microflo'

ensureOneIframeRuntime = (runtimes) ->
  localIframes = runtimes.filter (runtime) ->
    if runtime.protocol is 'iframe'
      return true
    false
  if localIframes.length > 1
    # Remove duplicates
    runtimes = runtimes.filter (runtime) ->
      return true unless runtime.protocol is 'iframe'
      return true if runtime.id is localIframes[0].id
      false

  if localIframes.length > 0
    localIframes[0].seen = Date.now()
    return

  local =
    label: 'Local NoFlo HTML5 environment'
    id: uuid()
    protocol: 'iframe'
    address: 'preview/iframe.html'
    type: 'noflo-browser'
  runtimes.push local

ensureMicroFloRuntimePerSerialDevice = (runtimes, callback) ->
  return callback runtimes if not microflo.serial.isSupported()

  microflo.serial.listDevices (devices) ->
    # Remove old
    isMicroFloSerial = (rt) ->
      return rt.protocol == 'microflo' && rt.address.indexOf('serial://') != -1
    newRuntimes = runtimes.filter (rt) -> not isMicroFloSerial rt
    # Add new
    for device in devices
      rt =
        label: device
        id: uuid()
        protocol: 'microflo'
        address: 'serial://'+device
        type: 'microflo'
        seen: new Date().toString()
      newRuntimes.push rt
    return callback newRuntimes

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'runtimes',
    datatype: 'array'
  c.outPorts.add 'runtimes',
    datatype: 'array'

  noflo.helpers.WirePattern c,
    in: 'runtimes'
    out: 'runtimes'
  , (data, groups, out) ->

    ensureOneIframeRuntime data
    ensureMicroFloRuntimePerSerialDevice data, (runtimes) ->
      out.send runtimes

  c
