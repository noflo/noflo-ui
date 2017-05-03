noflo = require 'noflo'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    async: true
  , (data, groups, out, callback) ->
    newState =
      workspace: data.state.workspace

    switch data.action
      when 'workspace:search:library'
        newState.workspace.search.components.splice 0, newState.workspace.search.components.length
        newState.workspace.search.query = data.payload
      when 'workspace:search:graph'
        newState.workspace.search.nodes.splice 0, newState.workspace.search.nodes.length
        newState.workspace.search.query = data.payload
      when 'workspace:search:results:library'
        newState.workspace.search.components.splice 0, newState.workspace.search.components.length
        newState.workspace.search.components.push result for result in data.payload

      when 'workspace:search:results:graph'
        newState.workspace.search.nodes.splice 0, newState.workspace.search.nodes.length
        newState.workspace.search.nodes.push result for result in data.payload

    out.send newState
    do callback
