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
  , (data, groups, out) ->
    ctx =
      packet: data
    out.send ctx

  c
