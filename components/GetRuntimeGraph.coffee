noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'context',
    datatype: 'object'
  c.outPorts.add 'context',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'context'
    out: 'context'
    async: true
  , (data, groups, out, callback) ->
    unless data.runtime
      return callback new Error 'No runtime available'
    unless data.runtime.definition
      return callback new Error 'Runtime has no definition available'

    if data.runtime.definition.graph
      data.remote = [] unless data.remote
      if data.remote.indexOf(data.runtime.definition.graph) is -1
        data.remote.unshift data.runtime.definition.graph
      out.send data
      do callback
      return

    # No graph available, prepare empty
    data.state = 'ok'
    data.graphs = [] unless data.graphs
    unless data.graphs.length
      emptyGraph = new noflo.Graph data.runtime.definition.id
      emptyGraph.properties.id = data.runtime.definition.id
      emptyGraph.properties.environment =
        type: data.runtime.definition.type
      data.graphs.unshift emptyGraph
    out.send data
    do callback
