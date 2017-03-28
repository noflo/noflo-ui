noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'existing',
    datatype: 'array'
  c.outPorts.add 'new',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    out: ['existing', 'new']
    async: true
  , (data, groups, out, callback) ->
    unless data.state?.projects?.local.length
      # No local projects, pass
      out.new.send data
      do callback
      return

    existing = data.state.projects.local.filter (project) ->
      return false unless project.repo is data.payload.repo
      if data.payload.branch is 'master' and not project.branch
        # We didn't use to store branch info, assume master
        return true
      return project.branch is data.payload.branch
    unless existing.length
      out.new.send data
      do callback
      return

    out.existing.send [
      'project'
      existing[0].id
      existing[0].main
    ]
    do callback

