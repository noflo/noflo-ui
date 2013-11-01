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

    @container.innerHTML = ''
    editor = document.createElement 'the-graph-editor'
    editor.graph = @graph
    @container.appendChild editor

    @loadPlugins editor

    if @outPorts.editor.isAttached()
      @outPorts.editor.send editor
      @outPorts.editor.disconnect()
    if @outPorts.graph.isAttached()
      @outPorts.graph.send @graph
      @outPorts.graph.disconnect()

    # Reset state
    @graph = null
    @runtime = null

  loadPlugins: (editor) ->
    plugins = [
      'preview'
      'source'
      'library'
      'menu'
    ]
    plugins.forEach (name) ->
      Plugin = require "../src/plugins/#{name}"
      editor.addPlugin name, new Plugin

exports.getComponent = -> new LoadGraphEditor
