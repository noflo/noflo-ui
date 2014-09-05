noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.description = 'Prepare a set of blob fetching requests for an operations object'
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'repository',
    datatype: 'string'
  c.outPorts.add 'sha',
    datatype: 'string'

  noflo.helpers.WirePattern c,
    in: 'in'
    out: ['out', 'repository', 'sha']
    forwardGroups: true
  , (data, groups, out) ->
    return if data.pull.length is 0
    out.out.send data

    for entry in data.pull
      continue unless entry.remote
      out.repository.send data.repo
      out.sha.send entry.remote.sha
