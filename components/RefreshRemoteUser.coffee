noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'invalid',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    out: ['out', 'invalid']
    async: true
  , (data, groups, out, callback) ->
    unless data?['grid-token']
      # If user is not logged in, there is nothing to do
      out.out.send data
      do callback
      return

    unless navigator.onLine
      # When offline we can't refresh
      out.out.send data
      do callback
      return

    # Try refreshing user information
    req = new XMLHttpRequest
    req.onreadystatechange = ->
      return unless req.readyState is 4
      if req.status is 401
        # We have invalid token, clear local user data
        out.invalid.send data
        do callback
        return
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
      # Update user information based on remote data
      data['grid-user'] = userData
      out.out.send data
      do callback
      return
    req.open 'GET', "$NOFLO_OAUTH_SERVICE_USER$NOFLO_OAUTH_ENDPOINT_USER", true
    req.setRequestHeader 'Authorization', "Bearer #{data['grid-token']}"
    req.send null
