noflo = require 'noflo'
registry = require 'flowhub-registry'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'user',
    datatype: 'object'
    required: true
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    params: 'user'
    out: 'out'
    async: true
  , (data, groups, out, callback) ->
    unless c.params?.user?['flowhub-token']
      # User not logged in, persist runtime only locally
      out.send data
      do callback
      return
    req = new XMLHttpRequest
    req.onreadystatechange = ->
      return unless req.readyState is 4
      unless req.status in [200, 201, 404]
        # Repository not available
        { message } = JSON.parse req.responseText
        if message.indexOf('"message":') isnt -1
          # JSON inside JSON, nice
          { message } = JSON.parse message
        callback new Error message
        return
      # Repository registered, let sync happen
      out.send data
      return
    req.open 'DELETE', "$NOFLO_REGISTRY_SERVICE/projects/#{data.id}", true
    req.setRequestHeader 'Authorization', "Bearer #{c.params.user['flowhub-token']}"
    req.send()
