noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'token',
    datatype: 'string'
    required: true
  c.inPorts.add 'site',
    datatype: 'string'
    required: true
  c.outPorts.add 'user',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'token'
    params: 'site'
    out: 'user'
    async: true
  , (token, groups, out, callback) ->
    req = new XMLHttpRequest
    req.onreadystatechange = ->
      return unless req.readyState is 4
      if req.status is 200
        try
          userData = JSON.parse req.responseText
        catch e
          return callback e
        out.beginGroup token
        out.send userData
        out.endGroup()
        do callback
        return
      callback new Error req.responseText
    req.open 'GET', "#{c.params.site}$NOFLO_OAUTH_ENDPOINT_USER", true
    req.setRequestHeader 'Authorization', "Bearer #{token}"
    req.send null

  c
