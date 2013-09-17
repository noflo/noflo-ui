Dataflow = require('/meemoo-dataflow').Dataflow
noflo = require '/noflo'

# Load plugins
nofloPlugin = require './plugins/noflo'

# Load NoFlo runtimes
runtimes =
  iframe: require './runtimes/iframe'

exports.start = (container, graphDefinition) ->
  noflo.graph.loadJSON graphDefinition, (graph) ->
    graph.baseDir = '/noflo-ui'

    # TODO: Check the runtime definition of the graph
    require './plugins/preview-iframe'
    
    dataflow = new Dataflow
      appendTo: container

    dataflow.plugins['preview-iframe'].setContents graph.properties.environment.preview, ->
      runtime = new runtimes['iframe'] dataflow, graph, dataflow.plugins['preview-iframe'].getElement()

      dataflow.plugins.noflo.registerGraph graph, runtime
