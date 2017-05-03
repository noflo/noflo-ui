noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    async: true
  , (data, groups, out, callback) ->
    unless data.state.workspace?.runtime?.selected
      return callback new Error 'No runtime connection available'
    runtime = data.state.workspace.runtime.selected
    unless runtime.canDo 'protocol:graph'
      return callback new Error 'Runtime connection doesn\'t allow Graph protocol'
    # TODO: Check response from runtime
    {command, payload} = data.payload
    runtime.sendGraph command, payload
    do callback
