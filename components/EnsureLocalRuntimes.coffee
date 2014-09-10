noflo = require 'noflo'
uuid = require 'uuid'
registry = require 'flowhub-registry'

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
    localIframes = data.filter (runtime) ->
      if runtime.type is 'noflo-browser' and runtime.address is 'preview/iframe.html'
        return true
      false
    if localIframes.length > 1
      # Remove duplicates
      data = data.filter (runtime) ->
        return true unless runtime.type is 'noflo-browser' and runtime.address is 'preview/iframe.html'
        return true if runtime.id is localIframes[0].id
        false

    if localIframes.length > 0
      localIframes[0].seen = Date.now()
      out.send data
      return

    local =
      label: 'Local NoFlo HTML5 environment'
      id: uuid()
      protocol: 'iframe'
      address: 'preview/iframe.html'
      type: 'noflo-browser'
    data.push local
    out.send data

  c
