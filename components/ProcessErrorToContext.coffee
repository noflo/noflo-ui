noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'error',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  c.process (input, output) ->
    return unless input.hasData 'error'
    error = input.getData 'error'
    ctx =
      error:
        process: error.id
        message: error.error
    output.sendDone
      out: ctx
