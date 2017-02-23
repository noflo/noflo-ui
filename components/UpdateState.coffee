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
      # Current graph in view
      graph: null
      # Current component in view
      component: null
      # Runtime connection
      runtime:
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
      local: []
    graphs:
      local: []
    components:
      local: []
    specs:
      local: []

getId = (type, entity) ->
  if type is 'components'
    return entity.name
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
  c.inPorts.add 'user',
    datatype: 'object'
  c.outPorts.add 'state',
    datatype: 'object'

  c.state = produceInitialState()
  c.shutdown = ->
    c.state = produceInitialState()

  c.inPorts.user.on 'data', (data) ->
    c.state.user = data
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
    if data.runtimes
      # Received initial runtimes listing
      mergeLists 'runtimes', c.state.runtimes.local, data.runtimes
      delete data.runtimes
    if data.projects
      # Received initial projects listing
      mergeLists 'projects', c.state.projects.local, data.projects
      delete data.projects
    if data.db
      # IndexedDB connection
      c.state.db = data.db
      delete data.db
    if data.persisted
      # Storage save/delete action
      if data.persisted.action is 'save'
        addToList data.persisted.type, c.state[data.persisted.type].local, data.persisted.entity
        delete data.persisted
    if data.clearLibrary
      # Remove all items from component library
      clearList c.state.workspace.library
      delete data.clearLibrary
    if data.componentDefinition
      # Component defs coming from runtime
      addToList 'components', c.state.workspace.library, data.componentDefinition
      delete data.componentDefinition

    if typeof data.project isnt 'undefined'
      if data.project
        # Project opened
        c.state.workspace.project = data.project
      else
        # Switched away from project, clear all current workspace
        clearWorkspace c.state.workspace
      delete data.project
    if typeof data.runtime isnt 'undefined'
      c.state.workspace.runtime.selected = data.runtime
      delete data.runtime
    if data.compatibleRuntimes
      clearList c.state.workspace.runtime.compatible
      mergeLists 'runtimes', c.state.workspace.runtime.compatible, data.compatibleRuntimes
      delete data.compatibleRuntimes
    if data.graphs
      c.state.workspace.graphs = data.graphs
      c.state.workspace.graph = data.graphs[data.graphs.length - 1] or null
      delete data.graphs
    if typeof data.component isnt 'undefined'
      c.state.workspace.component = data.component
      delete data.component

    if data.edges
      c.state.workspace.selection.edges = data.edges
      delete data.edges
    if data.nodes
      c.state.workspace.selection.nodes = data.nodes
      delete data.nodes

    if typeof data.search isnt 'undefined'
      c.state.workspace.search.query = data.search
      clearList c.state.workspace.search.components
      clearList c.state.workspace.search.nodes
      delete data.search

    if data.searchLibraryResult
      addToList 'components', c.state.workspace.search.components, data.searchLibraryResult
      delete data.searchLibraryResult

    unhandled = Object.keys data
    debugUnhandled data if unhandled.length

    out.send c.state
    do callback
