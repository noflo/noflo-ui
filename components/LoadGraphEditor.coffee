noflo = require 'noflo'

class LoadGraphEditor extends noflo.Component
  constructor: ->
    @editor = null
    @graph = null
    @container = null

    @inPorts =
      graph: new noflo.Port 'object'
      container: new noflo.Port 'object'
    @outPorts = {}

    @inPorts.graph.on 'data', (@graph) =>
      do @loadEditor
    @inPorts.container.on 'data', (@container) =>
      do @loadEditor

  loadEditor: ->
    return unless @graph and @container

    @editor = document.createElement 'the-graph-editor'
    @editor.graph = @graph
    @container.appendChild @editor

    # Reset state
    @graph = null
    @runtime = null

exports.getComponent = -> new LoadGraphEditor
