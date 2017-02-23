noflo = require 'noflo'
debugListHandling = require('debug') 'noflo-ui:storage'

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
      runtime: null
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
      debugListHandling "Updating existing #{type} #{getId(type, entity)}"
      for key, val of entity
        item[key] = val
      return
  # No match, add to list
  debugListHandling "Adding new #{type} #{getId(type, entity)}"
  list.push entity

clearList = (list) ->
  list.splice 0, list.length

clearWorkspace = (workspace) ->
  workspace.project = null
  workspace.graph = null
  workspace.component = null
  workspace.runtime = null
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
    if data.runtimes
      # Received initial runtimes listing
      mergeLists 'runtimes', c.state.runtimes.local, data.runtimes
    if data.projects
      # Received initial projects listing
      mergeLists 'projects', c.state.projects.local, data.projects
    if data.db
      # IndexedDB connection
      c.state.db = data.db
    if data.persisted
      # Storage save/delete action
      if data.persisted.action is 'save'
        addToList data.persisted.type, c.state[data.persisted.type].local, data.persisted.entity
    if data.clearLibrary
      # Remove all items from component library
      clearList c.state.workspace.library
    if data.componentDefinition
      # Component defs coming from runtime
      addToList 'components', c.state.workspace.library, data.componentDefinition

    if typeof data.project isnt 'undefined'
      if data.project
        # Project opened
        c.state.workspace.project = data.project
      else
        # Switched away from project, clear all current workspace
        clearWorkspace c.state.workspace
    if typeof data.runtime isnt 'undefined'
      c.state.workspace.runtime = data.runtime
    if data.graphs
      c.state.workspace.graphs = data.graphs
      c.state.workspace.graph = data.graphs[data.graphs.length - 1] or null
    if typeof data.component isnt 'undefined'
      c.state.workspace.component = data.component

    if data.edges
      c.state.workspace.selection.edges = data.edges
    if data.nodes
      c.state.workspace.selection.nodes = data.nodes

    out.send c.state
    do callback
