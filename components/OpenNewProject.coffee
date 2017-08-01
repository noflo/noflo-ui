noflo = require 'noflo'
projects = require '../src/projects'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'project',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'hash',
    datatype: 'array'
  noflo.helpers.WirePattern c,
    in: ['in', 'project']
    out: ['out', 'hash']
    async: true
    forwardGroups: false
  , (data, groups, out, callback) ->
    out.out.send data.project

    if data.in.state.project
      # We're already in project view, no need to open
      do callback
      return

    # Generate hash to open newly-created project
    projects.getProjectHash data.project, (err, hash) ->
      return callback() if err
      out.hash.send hash
      do callback
