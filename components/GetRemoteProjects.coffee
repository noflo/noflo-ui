noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'token',
    datatype: 'string'
  c.outPorts.add 'projects',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'token'
    out: 'projects'
    async: true
  , (token, groups, out, callback) ->
    req = new XMLHttpRequest
    req.onreadystatechange = ->
      return unless req.readyState is 4
      if req.status is 200
        try
          projects = JSON.parse req.responseText
        catch e
          return callback e
        out.send
          state: 'ok'
          remoteProjects: projects
        do callback
        return
      callback new Error req.responseText
    req.open 'GET', 'https://api.flowhub.io/projects', true
    req.setRequestHeader 'Authorization', "Bearer #{token}"
    req.send null

  c
