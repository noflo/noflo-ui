noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'bang'
  c.process (input, output) ->
    return unless input.hasData 'in'
    input.getData 'in'
    window.nofloDBReady = true
    output.done()
