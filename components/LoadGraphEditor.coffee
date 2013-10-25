noflo = require 'noflo'

class LoadGraphEditor extends noflo.Component
  constructor: ->
    @graph = null
    @container = null

    @inPorts =
      graph: new noflo.Port 'object'
      container: new noflo.Port 'object'
    @outPorts =
      graph: new noflo.Port 'object'
      editor: new noflo.Port 'object'

    @inPorts.graph.on 'data', (@graph) =>
      do @loadEditor
    @inPorts.container.on 'data', (@container) =>
      do @loadEditor

  loadEditor: ->
    return unless @graph and @container

    editor = document.createElement 'the-graph-editor'
    editor.graph = @graph
    @container.appendChild editor

    if @outPorts.editor.isAttached()
      @outPorts.editor.send editor
      @outPorts.editor.disconnect()
    if @outPorts.graph.isAttached()
      @outPorts.graph.send @graph
      @outPorts.graph.disconnect()

    # Reset state
    @graph = null
    @runtime = null

exports.getComponent = -> new LoadGraphEditor
