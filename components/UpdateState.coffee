noflo = require 'noflo'
debugUnhandled = require('debug') 'noflo-ui:state:unhandled'

# Initial application state
produceInitialState = ->
  return state =
    # Overall status: ok/loading/error
    state: 'ok'
    # IndexedDB connection
    db: null
    # User and API token information
    user: {}
    # Current workspace information
    workspace:
      # Project being edited. NULL when not in project
      project: null
      # Graph tree we're in
      graphs: []
      # Current graph in view. Instance of fbp-graph.Graph
      graph: null
      # Current component in view
      component: null
      # Runtime connection
      runtime:
        # Currently connected runtime. Instance of fbp-runtime-client
        selected: null
        compatible: []
      library: []
      search:
        query: null
        components: []
        nodes: []
      selection:
        edges: []
        nodes: []
    # Collections of user data. Local array is what we have in IndexedDB. Remote
    # can be populated from remote information sources like GitHub repo listing
    # or runtimes discovered via ZeroConf/USB
    projects:
      local: []
      remote: []
    runtimes:
      current: []
      local: []
    graphs:
      local: []
    components:
      local: []
    specs:
      local: []
    examples:
      remote: []

getId = (type, entity) ->
  if type is 'components'
    return entity.name
  if type is 'graph'
    return entity.properties.id or entity.id
  entity.id

mergeLists = (type, original, newList) ->
  addToList type, original, entity for entity in newList

addToList = (type, list, entity) ->
  for item in list
    # Entity is already in list as-is, skip
    return if item is entity
    if getId(type, item) is getId(type, entity)
      # ID match, update properties
      for key, val of entity
        item[key] = val
      return
  # No match, add to list
  list.push entity

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
  c.inPorts.add 'context',
    datatype: 'object'
  c.inPorts.add 'state',
    datatype: 'object'
  c.outPorts.add 'state',
    datatype: 'object'

  c.state = produceInitialState()
  c.shutdown = ->
    c.state = produceInitialState()

  c.inPorts.state.on 'data', (data) ->
    for key, val of data
      c.state[key] = val
    c.outPorts.state.send c.state

  noflo.helpers.WirePattern c,
    in: 'context'
    out: 'state'
    async: true
  , (data, groups, out, callback) ->
    # FIXME: We should really work on action types here
    # but the old Storage graphs don't supply those so
    # we infer action from payload keys
    if data.state
      # Updating loading/ok status
      c.state.state = data.state
      delete data.state
    if data.clearLibrary
      # Remove all items from component library
      clearList c.state.workspace.library
      delete data.clearLibrary
    if data.compatibleRuntimes
      clearList c.state.workspace.runtime.compatible
      mergeLists 'runtimes', c.state.workspace.runtime.compatible, data.compatibleRuntimes
      delete data.compatibleRuntimes

    if data.edges
      c.state.workspace.selection.edges = data.edges
      delete data.edges
    if data.nodes
      c.state.workspace.selection.nodes = data.nodes
      delete data.nodes

    unhandled = Object.keys data
    debugUnhandled data if unhandled.length

    out.send c.state
    do callback
