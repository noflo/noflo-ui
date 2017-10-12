noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.description = 'Strips state from action payloads for backwards compat'
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'all'
  noflo.helpers.WirePattern c,
    async: true
    forwardGroups: true
  , (data, groups, out, callback) ->
    out.send data.payload or data
    do callback
