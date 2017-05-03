noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'entity',
    datatype: 'object'
  c.inPorts.add 'type',
    datatype: 'string'
    required: true
  c.inPorts.add 'action',
    datatype: 'string'
    required: true
  c.outPorts.add 'context',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'entity'
    params: ['type', 'action']
    out: 'context'
  , (data, groups, out) ->
    out.send
      state: 'ok'
      persisted:
        type: c.params.type
        action: c.params.action
        entity: data
