Dataflow = require('/meemoo-dataflow').Dataflow
noflo = require '/noflo'

# Load plugins
nofloPlugin = require './plugins/noflo'

# Load NoFlo runtimes
runtimes =
  iframe: require './runtimes/iframe'

exports.start = (container, graphDefinition) ->
  dataflow = new Dataflow
    appendTo: container

  noflo.graph.loadJSON graphDefinition, (graph) ->
    graph.baseDir = '/noflo-ui'
    # TODO: Check the runtime definition of the graph
    runtime = new runtimes['iframe'] dataflow, graph, document.querySelector('.preview')
    dataflow.plugins.noflo.registerGraph graph, runtime
