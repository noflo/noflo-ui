noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'bang'

  noflo.helpers.WirePattern c,
    async: true
    forwardGroups: false
  , (data, groups, out, callback) ->
    window.location.hash = '#' + data.payload.map((part) ->
      return encodeURIComponent(part)
    ).join '/'
    out.send true
    do callback
