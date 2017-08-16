noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'action',
    datatype: 'string'
    required: true
    control: true
  c.inPorts.add 'in',
    datatype: 'all'
  c.outPorts.add 'out',
    datatype: 'all'

  noflo.helpers.WirePattern c,
    params: ['action']
    forwardGroups: false
    async: true
  , (data, groups, out, callback) ->
    actionParts = c.params.action.split ':'
    setTimeout ->
      out.beginGroup part for part in actionParts
      out.send
        action: c.params.action
        payload: data
      out.endGroup() for part in actionParts
      callback()
    , 1
