noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'token',
    datatype: 'string'
    required: true
  c.outPorts.add 'user',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'token'
    out: 'user'
    async: true
  , (token, groups, out, callback) ->
    req = new XMLHttpRequest
    req.onreadystatechange = ->
      return unless req.readyState is 4
      unless req.status is 200
        try
          data = JSON.parse req.responseText
          callback new Error data.message or "User fetching failed with #{req.status}"
        catch e
          callback new Error req.responseText
        return
      try
        userData = JSON.parse req.responseText
      catch e
        return callback e
      out.send userData
      do callback
      return
    req.open 'GET', "$NOFLO_OAUTH_SERVICE_USER$NOFLO_OAUTH_ENDPOINT_USER", true
    req.setRequestHeader 'Authorization', "Bearer #{token}"
    req.send null
