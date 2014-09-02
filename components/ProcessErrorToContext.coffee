noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'process',
    datatype: 'string'
  c.inPorts.add 'message',
    datatype: 'string'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: ['process', 'message']
    out: 'out'
  , (data, groups, out) ->
    ctx =
      error:
        process: data.process
        message: data.message
    out.send ctx

  c
