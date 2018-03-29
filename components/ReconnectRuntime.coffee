noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'client',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'string'
  c.outPorts.add 'error',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in', 'client'
    [data, client] = input.getData 'in', 'client'

    client.disconnect()
      .then(() -> client.connect())
      .then(() ->
        # Re-send current hash so we rebuild state completely
        hash = window.location.href.split('#')[1] or ''
        output.send
          out: hash
      )
      .then((() -> output.done()), (err) -> output.done(err))
