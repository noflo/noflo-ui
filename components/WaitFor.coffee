noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'packets',
    datatype: 'int'
    required: true
  c.inPorts.add 'in',
    datatype: 'bang'
  c.outPorts.add 'out',
    datatype: 'bang'

  c.received = 0
  c.shutdown = ->
    c.received = 0

  noflo.helpers.WirePattern c,
    params: 'packets'
    async: true
  , (data, groups, out, callback) ->
    c.received++
    if c.received < parseInt c.params.packets
      return callback()
    out.send true
    c.received = 0
    callback()
