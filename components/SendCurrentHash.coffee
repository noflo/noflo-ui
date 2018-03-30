noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'bang'
  c.outPorts.add 'out',
    datatype: 'string'
  c.process (input, output) ->
    return unless input.hasData 'in'
    input.getData 'in'
    output.sendDone
      out: window.location.href.split('#')[1] or ''
