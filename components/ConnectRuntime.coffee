noflo = require 'noflo'

class ConnectRuntime extends noflo.Component
  constructor: ->
    @editor = null
    @runtime = null
    @connected = false
    @project = null
    @example = null
    @inPorts =
      editor: new noflo.Port 'object'
      project: new noflo.Port 'object'
      newgraph: new noflo.Port 'object'
      example: new noflo.Port 'object'
      runtime: new noflo.Port 'object'
    @outPorts =
      editor: new noflo.Port 'object'
      packet: new noflo.Port 'object'
      runtime: new noflo.Port 'object'

    @inPorts.editor.on 'connect', =>
      if @editor and @runtime
        do @disconnect
      @editor = null
    @inPorts.editor.on 'data', (editor) =>
      @editor = editor
      @connect @editor, @runtime
      if @outPorts.editor.isAttached()
        @outPorts.editor.send @editor
        @outPorts.editor.disconnect()
    @inPorts.project.on 'data', (@project) =>
      @example = null
    @inPorts.newgraph.on 'data', (data) =>
      @sendGraph @runtime, data
    @inPorts.example.on 'data', (@example) =>
      @sendGraph @runtime, @example
    @inPorts.runtime.on 'connect', =>
      if @runtime
        do @disconnect
      @runtime = null
    @inPorts.runtime.on 'data', (runtime) =>
      @runtime = runtime
      @connect @editor, @runtime

  sendProject: (runtime, project) ->
    if project.components
      for component in project.components
        @sendComponent runtime, component
    if project.graphs
      for graph in project.graphs
        @sendGraph runtime, graph

  sendComponent: (runtime, component) ->
    return unless component.code

    # Check for platform-specific components
    runtimeType = component.code.match /@runtime ([a-z\-]+)/
    if runtimeType and runtimeType[1] isnt runtime.definition.type
      return

    runtime.sendComponent 'source',
      name: component.name
      language: component.language
      library: component.project
      code: component.code
      tests: component.tests

  sendGraph: (runtime, graph) ->
    if graph.properties.environment?.type
      if graph.properties.environment.type isnt 'all' and graph.properties.environment.type isnt @runtime.definition.type
        return

    runtime.sendGraph 'clear',
      id: graph.properties.id
      name: graph.name
      library: graph.properties.project
      main: ((@project and graph.properties.id is @project.main) or graph is @example)
    for node in graph.nodes
      runtime.sendGraph 'addnode',
        id: node.id
        component: node.component
        metadata: node.metadata
        graph: graph.properties.id
    for edge in graph.edges
      runtime.sendGraph 'addedge',
        src:
          node: edge.from.node
          port: edge.from.port
        tgt:
          node: edge.to.node
          port: edge.to.port
        metadata: edge.metadata
        graph: graph.properties.id
    for iip in graph.initializers
      runtime.sendGraph 'addinitial',
        src:
          data: iip.from.data
        tgt:
          node: iip.to.node
          port: iip.to.port
        metadata: iip.metadata
        graph: graph.properties.id
    if graph.inports
      for pub, priv of graph.inports
        runtime.sendGraph 'addinport',
          public: pub
          node: priv.process
          port: priv.port
          graph: graph.properties.id
    if graph.outports
      for pub, priv of graph.outports
        runtime.sendGraph 'addoutport',
          public: pub
          node: priv.process
          port: priv.port
          graph: graph.properties.id

  convertNode: (id, node) ->
    data = node.toJSON()
    data.graph = id
    return data
  convertEdge: (id, edge) ->
    data = edge.toJSON()
    edgeData =
      src:
        node: data.src.process
        port: data.src.port
      tgt:
        node: data.tgt.process
        port: data.tgt.port
      graph: id
  convertInitial: (id, iip) ->
    data = iip.toJSON()
    iipData =
      src:
        data: data.data
      tgt:
        node: data.tgt.process
        port: data.tgt.port
      graph: id
  convertBang: (id, bang) ->
    iipData =
      src:
        data: true
      tgt:
        node: bang.process
        port: bang.port
      graph: id

  connect: (editor, runtime) ->
    return unless editor and runtime
    @connected = false
    runtime.once 'connected', =>
      for name, def of editor.$.graph.library
        delete editor.$.graph.library[name]
    runtime.on 'connected', @onRuntimeConnected
    runtime.on 'disconnected', @onRuntimeDisconnected
    runtime.on 'component', @onRuntimeComponent
    runtime.on 'network', @onRuntimeNetwork
    runtime.on 'runtime', @onRuntimeRuntime
    runtime.on 'icon', @onRuntimeIcon

  disconnect: ->
    @connected = false
    @runtime.removeListener 'connected', @onRuntimeConnected
    @runtime.removeListener 'disconnected', @onRuntimeDisconnected
    @runtime.removeListener 'component', @onRuntimeComponent
    @runtime.removeListener 'network', @onRuntimeNetwork
    @runtime.removeListener 'runtime', @onRuntimeRuntime
    @runtime.removeListener 'icon', @onRuntimeIcon

  onRuntimeConnected: =>
    @connected = true
    @runtime.sendComponent 'list', ''
    @sendProject @runtime, @project if @project
    @sendGraph @runtime, @example if @example

  onRuntimeDisconnected: =>
    @connected = false

  onRuntimeComponent: (message) =>
    return unless message.command is 'component'
    if message.payload.name is 'Graph' or message.payload.name is 'ReadDocument'
      return
    definition =
      name: message.payload.name
      description: message.payload.description
      icon: message.payload.icon
      subgraph: message.payload.subgraph or false
      inports: []
      outports: []
    for port in message.payload.inPorts
      definition.inports.push
        name: port.id
        type: port.type
        required: port.required
        description: port.description
        addressable: port.addressable
        values: port.values
        default: port.default
    for port in message.payload.outPorts
      definition.outports.push
        name: port.id
        type: port.type
        required: port.required
        description: port.description
        addressable: port.addressable
    @editor.registerComponent definition

  onRuntimeRuntime: ({command, payload}) =>
    return unless command is 'runtime'
    return unless @runtime.definition
    for key, val of payload
      @runtime.definition[key] = val
    return unless @outPorts.runtime.isAttached()
    @outPorts.runtime.send @runtime.definition
    @outPorts.runtime.disconnect()

  onRuntimeNetwork: ({command, payload}) =>
    return if command is 'error'
    return unless payload.id
    @outPorts.packet.send
      edge: payload.id
      type: command
      group: if payload.group? then payload.group else ''
      data: if payload.data? then payload.data else ''
      subgraph: if payload.subgraph? then payload.subgraph else ''
      runtime: @runtime.definition.id

  onRuntimeIcon: ({id, icon}) =>
    return unless @editor.updateIcon
    @editor.updateIcon id, icon

exports.getComponent = -> new ConnectRuntime
