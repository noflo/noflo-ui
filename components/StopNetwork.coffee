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

    graphId = data.graph.name or data.graph.properties.id
    client.connect()
      .then(() ->
        client.protocol.network.stop(
          graph: graphId
        )
      )
      .then((status) ->
        output.send
          out:
            status: status
            runtime: client.definition.id
      )
      .then((() -> output.done()), (err) -> output.done(err))
