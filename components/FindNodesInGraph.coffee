noflo = require 'noflo'

exports.getComponent = () ->
  c = new noflo.Component
  c.inPorts.add 'graph',
    datatype: 'object'
  c.inPorts.add 'search',
    datatype: 'string'
  c.outPorts.add 'nodes',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    in: 'search'
    params: ['graph']
    out: 'nodes'
  , (search, groups, out) ->
    return unless search?
    return unless c.params.graph

    if search.length < 1
      out.send null
      return

    term = search.toLowerCase()
    for node in c.params.graph.nodes
      name = node.metadata.label.toLowerCase()
      if name.indexOf(term) >= 0
        out.send node


  c
