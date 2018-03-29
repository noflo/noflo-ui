noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'missed',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in'
    data = input.getData 'in'
    unless data.state.runtime
      output.sendDone
        missed: data
      return
    output.sendDone
      out: data
