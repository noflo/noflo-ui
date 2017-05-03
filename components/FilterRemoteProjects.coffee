noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    async: true
  , (data, groups, out, callback) ->
    # Start by clearing the list
    data.state.projects.remote.splice 0, data.state.projects.remote.length
    remote = data.payload.filter (remoteProject) ->
      for project in data.state.projects.local
        if project.repo is remoteProject.repo
          # Skip projects we have already fetched locally
          return false
      true
    for project in remote
      data.state.projects.remote.push project
    out.send data.state
    do callback
