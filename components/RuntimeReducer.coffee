noflo = require 'noflo'
{ componentForLibrary } = require '../src/runtime'

exports.getComponent = ->
  c = new noflo.Component
  c.icon = 'cogs'
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'context',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in'
    data = input.getData 'in'
    switch data.action
      when 'runtime:opening'
        output.sendDone
          context:
            state: 'loading'
        return
      when 'runtime:opened'
        output.sendDone
          context:
            state: 'ok'
            graphs: data.payload.graphs
            component: data.payload.component
        return
      when 'runtime:components'
        output.sendDone
          context:
            componentLibrary: data.payload.components.map componentForLibrary
      when 'runtime:component'
        output.sendDone
          context:
            componentDefinition: componentForLibrary data.payload.component
        return
      when 'runtime:error'
        state =
          state: 'error'
          error: data.payload
        output.sendDone
          context: state
        return
