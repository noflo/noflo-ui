noflo = require 'noflo'
{ getComponentType } = require '../src/runtime'

exports.getComponent = ->
  c = new noflo.Component
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'project',
    datatype: 'object'
  c.inPorts.add 'client',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in', 'project', 'client'
    [data, project, client] = input.getData 'in', 'project', 'client'

    component = data.component
    componentType = getComponentType component
    if componentType and componentType isnt client.definition.type
      # Ignore components for different runtime type
      output.done()
      return

    client.connect()
      .then(() ->
        client.protocol.component.source(
          name: component.name
          language: component.language
          library: project?.namespace or client.definition.namespace
          code: component.code
          tests: component.tests
        )
      )
      .then((componentDefinition) ->
        output.send
          out:
            component: componentDefinition
            runtime: client.definition.id
      )
      .then((() -> output.done()), (err) -> output.done(err))
