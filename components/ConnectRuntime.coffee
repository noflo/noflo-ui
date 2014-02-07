noflo = require 'noflo'

class ConnectRuntime extends noflo.Component
  constructor: ->
    @editor = null
    @runtime = null
    @connected = false
    @project = null
    @inPorts =
      editor: new noflo.Port 'object'
      project: new noflo.Port 'object'
      newgraph: new noflo.Port 'object'
      runtime: new noflo.Port 'object'
    @outPorts =
      editor: new noflo.Port 'object'

    @inPorts.editor.on 'data', (@editor) =>
      @connect @editor, @runtime
      if @outPorts.editor.isAttached()
        @outPorts.editor.send @editor
        @outPorts.editor.disconnect()
    @inPorts.project.on 'data', (@project) =>
    @inPorts.newgraph.on 'data', (data) =>
      @sendGraph @runtime, data
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
    runtime.sendGraph 'clear',
      id: graph.id
      name: graph.name
      library: graph.project
      main: (@project and graph.id is @project.main)
    for name, definition of graph.processes
      runtime.sendGraph 'addnode',
        id: name
        component: definition.component
        metadata: definition.metadata
        graph: graph.id
    for edge in graph.connections
      if edge.src
        runtime.sendGraph 'addedge',
          src:
            node: edge.src.process
            port: edge.src.port
          tgt:
            node: edge.tgt.process
            port: edge.tgt.port
          graph: graph.id
        continue
      runtime.sendGraph 'addinitial',
        src:
          data: edge.data
        tgt:
          node: edge.tgt.process
          port: edge.tgt.port
        graph: graph.id

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

  subscribeEditor: (id, editor, runtime) ->
    editor.addEventListener 'addnode', (node) =>
      return unless @connected
      runtime.sendGraph 'addnode', @convertNode id, node.detail
    , false
    editor.addEventListener 'removenode', (node) =>
      return unless @connected
      runtime.sendGraph 'removenode', @convertNode id, node.detail
    , false
    editor.addEventListener 'addedge', (edge) =>
      return unless @connected
      runtime.sendGraph 'addedge', @convertEdge id, edge.detail
    , false
    editor.addEventListener 'removeedge', (edge) =>
      return unless @connected
      runtime.sendGraph 'removeedge', @convertEdge id, edge.detail
    , false
    editor.addEventListener 'removeinitial', (iip) =>
      return unless @connected
      runtime.sendGraph 'removeinitial', @convertInitial id, iip.detail
    , false
    # IIP value changes need to be propagated as add+remove
    editor.addEventListener 'iip', (iip) =>
      return unless @connected
      runtime.sendGraph 'removeinitial', @convertInitial id, iip.detail
      runtime.sendGraph 'addinitial', @convertInitial id, iip.detail
    , false
    editor.addEventListener 'bang', (bang) =>
      return unless @connected
      runtime.sendGraph 'removeinitial', @convertBang id, bang.detail
      runtime.sendGraph 'addinitial', @convertBang id, bang.detail
    , false

  connect: (editor, runtime) ->
    return unless editor and runtime
    @connected = false
    runtime.on 'connected', =>
      @connected = true
      runtime.sendComponent 'list', ''
      @sendProject @runtime, @project if @project
    runtime.on 'disconnected', =>
      @connected = false
    @subscribeEditor editor.graph.id, editor, runtime

    runtime.on 'component', (message) ->
      if message.payload.name is 'Graph' or message.payload.name is 'ReadDocument'
        return
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
    edges = {}
    runtime.on 'network', ({command, payload}) ->
      return if command is 'error'
      return unless payload.tgt and payload.src
      id = "#{payload.src.node}#{payload.src.port}#{payload.tgt.node}#{payload.tgt.port}"
      unless edges[id]
        edges[id] = editor.querySelector "the-graph-edge[source=\"#{payload.src.node}.#{payload.src.port}\"][target=\"#{payload.tgt.node}.#{payload.tgt.port}\"]"
      edge = edges[id]
      return unless edge and edge.log
      edge.log.push
        type: command
        group: if payload.group? then payload.group else ''
        data: if payload.data? then payload.data else ''
    runtime.on 'icon', ({id, icon}) ->
      return unless editor.updateIcon
      editor.updateIcon id, icon

    runtime.setParentElement editor.parentNode
    runtime.connect editor.graph.properties.environment

exports.getComponent = -> new ConnectRuntime
