noflo = require 'noflo'
Dataflow = require('/meemoo-dataflow').Dataflow

# Load NoFlo library plugin
require '../src/plugins/nofloLibrary'
# Load NoFlo Graph sync plugin
require '../src/plugins/nofloGraph'
# Load NoFlo preview plugin
require '../src/plugins/preview'

class DataflowComponent extends noflo.Component
  constructor: ->
    @graph = null
    @container = null
    @runtime = null

    @inPorts =
      graph: new noflo.Port 'object'
      container: new noflo.Port 'object'
      runtime: new noflo.Port 'object'
    @outPorts =
      dataflow: new noflo.Port 'object'
      runtime: new noflo.Port 'object'
      graph: new noflo.Port 'object'
      error: new noflo.Port 'object'

    @inPorts.graph.on 'data', (@graph) =>
      do @loadDataflow
    @inPorts.container.on 'data', (@container) =>
      do @loadDataflow
    @inPorts.runtime.on 'data', (@runtime) =>
      do @loadDataflow

  loadDataflow: ->
    return unless @graph and @container and @runtime

    # Load a Dataflow instance
    dataflow = new Dataflow
      appendTo: @container

    # Pass necessary information to the runtime
    @runtime.setParentElement dataflow.el

    # Load runtime and pass to preview plugin
    env = @graph.properties.environment
    dataflow.plugins.preview.setPreview env, @runtime

    # Register components with Dataflow
    dataflow.plugins.nofloLibrary.registerGraph @graph, @runtime
    # Register graph with Dataflow
    dataflow.plugins.nofloGraph.registerGraph @graph, @runtime

    # Pass data onwards
    if @outPorts.dataflow.isAttached()
      @outPorts.dataflow.send dataflow
      @outPorts.dataflow.disconnect()
    if @outPorts.runtime.isAttached()
      @outPorts.runtime.send @runtime
      @outPorts.runtime.disconnect()
    if @outPorts.graph.isAttached()
      @outPorts.graph.send @graph
      @outPorts.graph.disconnect()

    # Reset state
    @graph = null
    @runtime = null

exports.getComponent = -> new DataflowComponent
