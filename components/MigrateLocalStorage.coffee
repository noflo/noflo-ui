noflo = require 'noflo'

# @runtime noflo-browser

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'graphstore',
    datatype: 'object'

  getGraphs = ->
    graphIds = localStorage.getItem 'noflo-ui-graphs'
    graphs = []
    return graphs unless graphIds
    ids = graphIds.split ','
    for id in ids
      graph = getGraph id
      continue unless graph
      graphs.push graph
    return graphs

  getGraph = (id) ->
    json = localStorage.getItem id
    return unless json
    graph = JSON.parse json
    graph.id = id
    graph.project = ''
    return graph

  c.process (input, output) ->
    return unless input.hasData 'graphstore'
    store = input.getData 'graphstore'

    # Don't use localStorage in Chrome App
    if typeof chrome isnt 'undefined' and chrome.storage
      return output.done()

    try
      localStorage
    catch e
      # No localStorage support, skip
      return output.done()

    graphs = getGraphs()
    return output.done() if graphs.length is 0
    succeeded = 0
    success = ->
      succeeded++
      return unless succeeded is graphs.length
      # TODO: Remove from localStorage?
      # localStorage.removeItem 'noflo-ui-graphs'
      output.done()
    graphs.forEach (graph) ->
      req = store.put graph
      req.onsuccess = success
