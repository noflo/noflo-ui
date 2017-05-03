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
      project.gist is data.payload.gist
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
