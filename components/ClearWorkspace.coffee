noflo = require 'noflo'

clearList = (list) ->
  list.splice 0, list.length
clearWorkspace = (workspace) ->
  workspace.project = null
  workspace.graph = null
  workspace.component = null
  workspace.runtime.selected = null
  clearList workspace.runtime.compatible
  clearList workspace.graphs
  clearList workspace.library
  workspace.search.query = null
  clearList workspace.search.components
  clearList workspace.search.nodes
  clearList workspace.selection.edges
  clearList workspace.selection.nodes

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'

  noflo.helpers.WirePattern c,
    async: true
  , (data, groups, out, callback) ->
    clearWorkspace data.state.workspace
    out.send data.state
    do callback
