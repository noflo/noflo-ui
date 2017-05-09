noflo = require 'noflo'

# @runtime noflo-browser

class MigrateLocalStorage extends noflo.Component
  constructor: ->
    super()

    @inPorts =
      graphstore: new noflo.Port 'object'

    @inPorts.graphstore.on 'data', (store) =>
      @migrateGraphs store

  getGraphs: ->
    graphIds = localStorage.getItem 'noflo-ui-graphs'
    graphs = []
    return graphs unless graphIds
    ids = graphIds.split ','
    for id in ids
      graph = @getGraph id
      continue unless graph
      graphs.push graph
    return graphs

  getGraph: (id) ->
    json = localStorage.getItem id
    return unless json
    graph = JSON.parse json
    graph.id = id
    graph.project = ''
    return graph

  migrateGraphs: (store) ->
    # Don't use localStorage in Chrome App
    return if typeof chrome isnt 'undefined' and chrome.storage

    try
      localStorage
    catch e
      # No localStorage support, skip
      return
    graphs = @getGraphs()
    return if graphs.length is 0
    succeeded = 0
    success = ->
      succeeded++
      return unless succeeded is graphs.length
      # TODO: Remove from localStorage?
      # localStorage.removeItem 'noflo-ui-graphs'
    graphs.forEach (graph) ->
      req = store.put graph
      req.onsuccess = success

exports.getComponent = -> new MigrateLocalStorage
