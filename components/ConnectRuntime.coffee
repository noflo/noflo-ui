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
    for name, plugin of editor.plugins
      continue unless plugin.registerRuntime
      plugin.registerRuntime runtime

    runtime.once 'connected', ->
      # TODO: Read basedir from graph?
      runtime.sendComponent 'list', 'noflo-ui-preview'
    runtime.on 'connected', =>
      runtime.sendGraph 'clear',
        baseDir: 'noflo-ui-preview'
      graph = editor.toJSON()
      for name, definition of graph.processes
        runtime.sendGraph 'addnode',
          id: name
          component: definition.component
          metadata: definition.metadata
      for edge in graph.connections
        if edge.src
          runtime.sendGraph 'addedge',
            from:
              node: edge.src.process
              port: edge.src.port
            to:
              node: edge.tgt.process
              port: edge.tgt.port
          continue
        runtime.sendGraph 'addinitial',
          from:
            data: edge.data
          to:
            node: edge.tgt.process
            port: edge.tgt.port

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
    runtime.connect editor.graph.properties.environment

exports.getComponent = -> new ConnectRuntime
