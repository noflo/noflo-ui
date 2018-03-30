noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'client',
    datatype: 'object'
  c.inPorts.add 'graphs',
    datatype: 'array'
  c.inPorts.add 'edges',
    datatype: 'array'
  c.outPorts.add 'out',
    datatype: 'array'
  c.outPorts.add 'error',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'client', 'graphs', 'edges'
    [client, graphs, edges] = input.getData 'client', 'graphs', 'edges'
    output.send
      out: edges
    unless graphs.length
      return output.done new Error "No graph specified"
    currentGraph = graphs[graphs.length - 1]
    client.protocol.network.edges(
      graph: currentGraph.name or currentGraph.properties.id
      edges: edges.map (e) ->
        edge =
          src: e.from
          tgt: e.to
        return edge
    )
      .then((() -> output.done()), (err) -> output.done(err))
