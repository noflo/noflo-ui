noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'string'
  c.outPorts.add 'out',
    datatype: 'bang'

  noflo.helpers.WirePattern c,
    async: true
    forwardGroups: false
  , (data, groups, out, callback) ->
    # This will in effect cause a NoFlo network stop as the app
    # redirects to new URL
    window.location.href = data
    out.send true
    do callback
