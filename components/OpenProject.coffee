noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'open',
    datatype: 'array'
  c.outPorts.add 'pass',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'in'
    out: ['open', 'pass']
    forwardGroups: false
    async: true
  , (data, groups, out, callback) ->
    out.pass.send data
    return callback() if data.state.workspace.project
    out.open.send ['project', data.payload.id, data.payload.main]
    callback()
