noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'context',
    datatype: 'object'
  c.outPorts.add 'ready',
    datatype: 'object'
  c.outPorts.add 'missing',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'context'
    out: ['ready', 'missing']
  , (data, groups, out) ->
    unless data.runtime
      return c.error new Error 'No runtime available'
    unless data.runtime.definition
      return c.error new Error 'Runtime has no definition available'

    if data.runtime.definition.graph
      data.remote = [] unless data.remote
      data.remote.unshift data.runtime.definition.graph
      out.missing.send data
      return

    # No graph available, prepare empty
    data.state = 'ok'
    data.graphs = [] unless data.graphs
    emptyGraph = new noflo.Graph
    emptyGraph.properties.id = data.runtime.definition.id
    data.graphs.unshift emptyGraph
    out.ready.send data

  c
