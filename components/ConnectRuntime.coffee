noflo = require 'noflo'

class ConnectRuntime extends noflo.Component
  constructor: ->
    @editor = null
    @runtime = null
    @inPorts =
      editor: new noflo.Port 'object'
      runtime: new noflo.Port 'object'
    @outPorts = {}

    @inPorts.editor.on 'data', (@editor) =>
      @connect @editor, @runtime
    @inPorts.runtime.on 'data', (@runtime) =>
      @connect @editor, @runtime

  connect: (editor, runtime) ->
    return unless editor and runtime
    runtime.on 'connected', ->
      # TODO: Read basedir from graph?
      runtime.sendComponent 'list', 'noflo-ui-preview'
    runtime.on 'component', (message) ->
      definition =
        name: message.payload.name
        description: message.payload.description
        icon: message.payload.icon
        inports: []
        outports: []
      for port in message.payload.inPorts
        definition.inports.push
          name: port.id
          type: port.type
          array: port.array
      for port in message.payload.outPorts
        definition.outports.push
          name: port.id
          type: port.type
          array: port.array
      editor.registerComponent definition
    runtime.setParentElement editor.parentNode
    runtime.connect editor.graph.properties.preview

exports.getComponent = -> new ConnectRuntime
