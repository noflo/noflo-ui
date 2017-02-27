noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'key',
    datatype: 'string'
    required: true
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    params: 'key'
    async: true
  , (data, groups, out, callback) ->
    data.state[c.params.key] = data.payload
    out.send data.state
    do callback
