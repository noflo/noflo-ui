noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'client',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in', 'client'
    [data, client] = input.getData 'in', 'client'

    client.disconnect()
      .then(() -> client.connect())
      .then(() ->
        output.send
          out: client.definition
      )
      .then((() -> output.done()), (err) -> output.done(err))
