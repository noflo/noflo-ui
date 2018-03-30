noflo = require 'noflo'
fbpGraph = require 'fbp-graph'
{ loadGraph } = require '../src/runtime'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'client',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'

  c.process (input, output) ->
    return unless input.hasData 'in', 'client'
    [route, client] = input.getData 'in', 'client'

    state =
      state: 'ok'
      graphs: []
      remote: []
      project: {}
      component: null
      runtime: route.runtime

    client.connect()
      .then((def) ->
        # Start by loading main graph
        unless def.graph
          return Promise.reject new Error "Runtime #{def.id} is not running a graph"

        # TODO: Populate project information

        return client.protocol.component.getsource(
          name: def.graph
        )
      )
      .then(loadGraph)
      .then((graphInstance) ->
        state.graphs.push graphInstance
      )
      .then(() ->
        output.send
          out: state
      )
      .then((() -> output.done()), (err) -> output.done(err))
