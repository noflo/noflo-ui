noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'bang'
  c.outPorts.add 'out',
    datatype: 'string'

  noflo.helpers.WirePattern c,
    async: true
    forwardGroups: false
  , (data, groups, out, callback) ->
    out.send window.location.href
    do callback
