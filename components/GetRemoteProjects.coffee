noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'user',
    datatype: 'object'
  c.outPorts.add 'projects',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'user'
    out: 'projects'
    async: true
  , (user, groups, out, callback) ->
    return callback() unless user['grid-token']
    req = new XMLHttpRequest
    req.onreadystatechange = ->
      return unless req.readyState is 4
      if req.status is 200
        try
          projects = JSON.parse req.responseText
        catch e
          return callback e
        out.send projects
        do callback
        return
      callback new Error req.responseText
    req.open 'GET', '$NOFLO_REGISTRY_SERVICE/projects', true
    req.setRequestHeader 'Authorization', "Bearer #{user['github-token']}"
    req.send null

  c
