noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'packet',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'packet'
    out: 'out'
    async: true
  , (data, groups, out, callback) ->
    ctx =
      packet: data
    out.send ctx
    do callback
