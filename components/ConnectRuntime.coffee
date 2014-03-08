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

    @inPorts.editor.on 'data', (@editor) =>
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
      @runtime = null
    @inPorts.runtime.on 'data', (runtime) =>
      @runtime.stop() if @runtime
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
    runtime.sendComponent 'source',
      name: component.name
      language: component.language
      library: component.project
      code: component.code
      tests: component.tests

  sendGraph: (runtime, graph) ->
    if graph.properties.environment.type and graph.properties.environment.type isnt @runtime.definition.type
      return

    runtime.sendGraph 'clear',
      id: graph.properties.id
      name: graph.name
      library: graph.properties.project
      main: (@project and graph.properties.id is @project.main)
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
    runtime.on 'connected', =>
      @connected = true
      runtime.sendComponent 'list', ''
      @sendProject @runtime, @project if @project
      @sendGraph @runtime, @example if @example
    runtime.on 'disconnected', =>
      @connected = false

    runtime.on 'component', (message) ->
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
      for port in message.payload.outPorts
        definition.outports.push
          name: port.id
          type: port.type
          required: port.required
          description: port.description
          addressable: port.addressable
      editor.registerComponent definition
    edges = {}
    runtime.on 'network', ({command, payload}) =>
      return if command is 'error'
      return unless payload.id
      @outPorts.packet.send
        edge: payload.id
        type: command
        group: if payload.group? then payload.group else ''
        data: if payload.data? then payload.data else ''
        subgraph: if payload.subgraph? then payload.subgraph else ''
    runtime.on 'icon', ({id, icon}) ->
      return unless editor.updateIcon
      editor.updateIcon id, icon

exports.getComponent = -> new ConnectRuntime
