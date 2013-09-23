noflo = require 'noflo'
Dataflow = require('/meemoo-dataflow').Dataflow

# Load NoFlo connector plugin
nofloPlugin = require '../src/plugins/noflo'


class DataflowComponent extends noflo.AsyncComponent
  constructor: ->
    @preview = 'iframe'
    @container = null
    @inPorts =
      graph: new noflo.Port 'object'
      container: new noflo.Port 'object'
      preview: new noflo.Port 'string'
    @outPorts =
      dataflow: new noflo.Port 'object'
      runtime: new noflo.Port 'object'
      graph: new noflo.Port 'object'
      error: new noflo.Port 'object'

    @inPorts.container.on 'data', (@container) =>
    @inPorts.preview.on 'data', (@preview) =>

    super 'graph', 'dataflow'

  doAsync: (graph, done) ->
    unless @container
      done new Error 'Dataflow needs a containing DOM element'
      return

    # Load preview plugin
    preview = "preview-#{@preview}"
    env = graph.properties.environment
    require "../src/plugins/#{preview}"

    dataflow = new Dataflow
      appendTo: @container

    dataflow.plugins[preview].preparePreview env.preview, =>
      # Load runtime
      rt = @loadRuntime()
      runtime = new rt dataflow, graph

      # Register graph with Dataflow
      dataflow.plugins.noflo.registerGraph graph, runtime

      if @outPorts.dataflow.isAttached()
        @outPorts.dataflow.send dataflow
        @outPorts.dataflow.disconnect()
      if @outPorts.runtime.isAttached()
        @outPorts.runtime.send dataflow
        @outPorts.runtime.disconnect()
      if @outPorts.graph.isAttached()
        @outPorts.graph.send graph
        @outPorts.graph.disconnect()
      done()

  loadRuntime: ->
    return require "../src/runtimes/#{@preview}"

exports.getComponent = -> new DataflowComponent
