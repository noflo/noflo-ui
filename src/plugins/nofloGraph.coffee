# Dataflow plugin for synchronizing a NoFlo graph with a Dataflow
# graph
{Dataflow} = require '/meemoo-dataflow'
Graph = Dataflow::module 'graph'

class NoFloGraphPlugin
  constructor: ->
    @dataflow = null

  initialize: (@dataflow) ->
    # Modify behavior of other Dataflow plugins
    @dataflow.plugins.source.listeners false
    @dataflow.plugins.source.allowUpdate false
    @runtime = null

  registerGraph: (graph, runtime) ->
    dfGraph = @dataflow.loadGraph {}
    @runtime = runtime
    callback = if callback then callback else ->
    @prepareGraph graph, dfGraph, runtime

    # When we reconnect we should clear and update the graph
    runtime.on 'connected', =>
      return unless runtime is @runtime
      runtime.sendGraph 'clear',
        baseDir: graph.baseDir
      for node in graph.nodes
        @addNodeRuntime node, runtime
      for edge in graph.edges
        @addEdgeRuntime edge, runtime
      for iip in graph.initializers
        @addInitialRuntime iip, runtime

  registerSubgraph: (graph, runtime) ->
    dfGraph = new Graph.Model
      dataflow: @dataflow
    callback = if callback then callback else ->
    @prepareGraph graph, dfGraph, runtime

  prepareGraph: (nofloGraph, dataflowGraph, runtime) ->
    # Provide a reference to the NoFlo graph
    dataflowGraph.nofloGraph = nofloGraph

    # Provide a backreference to the Dataflow graph
    nofloGraph.dataflowGraph = dataflowGraph

    @subscribeDataflowEvents dataflowGraph
    @subscribeNoFloEvents nofloGraph, runtime
    for node in nofloGraph.nodes
      @addNodeDataflow node, dataflowGraph
    for edge in nofloGraph.edges
      @addEdgeDataflow edge, dataflowGraph
    for iip in nofloGraph.initializers
      @addInitialDataflow iip, dataflowGraph

  subscribeDataflowEvents: (graph) ->
    # Update Dataflow source plugin with latest graph JSON
    graph.on 'change', (dfGraph) =>
      json = JSON.stringify graph.nofloGraph.toJSON(), null, 2
      @dataflow.plugins.source.show json

    @dataflow.on 'node:add', (dfGraph, node) =>
      return unless dfGraph is graph
      @subscribeDataflowNode node, graph

    @dataflow.on 'edge:add', (dfGraph, edge) =>
      return unless dfGraph is graph
      @subscribeDataflowEdge edge, graph

    @dataflow.on "node:remove", (dfGraph, node) ->
      return unless dfGraph is graph
      if node.nofloNode
        graph.nofloGraph.removeNode node.nofloNode.id

    @dataflow.on "edge:remove", (dfGraph, edge) ->
      return unless dfGraph is graph
      if edge.nofloEdge
        edge = edge.nofloEdge
        graph.nofloGraph.removeEdge edge.from.node, edge.from.port, edge.to.node, edge.to.port

  subscribeDataflowNode: (node, graph) ->

    randomString = (num) ->
      unless num?
        num = 60466176 # 36^5
      num = Math.floor( Math.random() * num )
      return num.toString(36)

    unless node.nofloNode?
      # Ensure IDs are unique strings
      # id = node.id+""
      id = node.type + '_' + randomString()
      while graph.nofloGraph.getNode(id)?
        id = node.type + '_' + randomString()
      node.set("nofloId", id)
      # Sync label
      label = node.get("label")
      unless label?
        label = node.type
      nofloNode = graph.nofloGraph.addNode id, node.type,
        x: node.get 'x'
        y: node.get 'y'
        label: label

      # Reference one another
      node.nofloNode = nofloNode
      nofloNode.dataflowNode = node

    node.on 'change:label', (node, newName) ->
      # Change label
      node.nofloNode.metadata.label = newName
      # Change id
      oldName = node.nofloNode.id
      # Ensure unique
      newId = newName + '_' + randomString()
      while graph.nofloGraph.getNode(newId)?
        newId = newName + '_' + randomString()
      graph.nofloGraph.renameNode oldName, newId
    node.on 'change:x change:y', ->
      node.nofloNode.metadata.x = node.get 'x'
      node.nofloNode.metadata.y = node.get 'y'
    node.on 'change:state', (port, value) ->
      metadata = {}
      for iip in graph.nofloGraph.initializers
        continue unless iip
        if iip.to.node is node.nofloNode.id and iip.to.port is port
          return if iip.from.data is value
          metadata = iip.metadata
          graph.nofloGraph.removeInitial node.nofloNode.id, port
      graph.nofloGraph.addInitial value, node.nofloNode.id, port, metadata
    node.on 'bang', (port) ->
      metadata = {}
      for iip in graph.nofloGraph.initializers
        continue unless iip
        if iip.to.node is node.nofloNode.id and iip.to.port is port
          metadata = iip.metadata
          graph.nofloGraph.removeInitial node.nofloNode.id, port
      # Transmit bang to the NoFlo runtime
      graph.nofloGraph.addInitial true, node.nofloNode.id, port, metadata
      # Don't save bang IIP to the graph (#9)
      graph.nofloGraph.removeInitial node.nofloNode.id, port

  subscribeDataflowEdge: (edge, graph) ->
    unless edge.nofloEdge
      nofloEdge = graph.nofloGraph.addEdge edge.source.parentNode.nofloNode.id, edge.source.id, edge.target.parentNode.nofloNode.id, edge.target.id,
        route: edge.get 'route'

      # Reference one another
      edge.nofloEdge = nofloEdge
      nofloEdge.dataflowEdge = edge

    edge.on 'change:route', ->
      edge.nofloEdge.metadata.route = edge.get 'route'

  subscribeNoFloEvents: (graph, runtime) ->
    graph.on 'addNode', (nfNode) =>
      setTimeout =>
        @addNodeDataflow nfNode, graph.dataflowGraph
        @addNodeRuntime nfNode, runtime
      , 0
    graph.on 'removeNode', (nfNode) =>
      if nfNode.dataflowNode?
        nfNode.dataflowNode.remove()
      runtime.sendGraph 'removenode',
        id: nfNode.id
    graph.on 'addEdge', (nfEdge) =>
      setTimeout =>
        @addEdgeDataflow nfEdge, graph.dataflowGraph
        @addEdgeRuntime nfEdge, runtime
      , 0
    graph.on 'removeEdge', (nfEdge) =>
      if nfEdge.from.node? and nfEdge.to.node?
        if nfEdge.dataflowEdge?
          nfEdge.dataflowEdge.remove()
      runtime.sendGraph 'removeedge',
        from: nfEdge.from
        to: nfEdge.to
    graph.on 'addInitial', (iip) =>
      @addInitialDataflow iip, graph.dataflowGraph
      @addInitialRuntime iip, runtime
      @dataflow.plugins.log.add "IIP added to #{iip.to.node} #{iip.to.port.toUpperCase()}"
    graph.on 'removeInitial', (iip) =>
      @dataflow.plugins.log.add "IIP removed from #{iip.to.node} #{iip.to.port.toUpperCase()}"
      runtime.sendGraph 'removeinitial',
        from: iip.from
        to: iip.to

    # Pass network events to edge inspector
    runtime.on 'network', ({command, payload}) =>
      return unless runtime is @runtime
      if command is 'error'
        @dataflow.plugins.notification.notify 'noflo.png', 'Error', payload.message
        return

      return unless payload.to or payload.from
      eventEdge = null
      for edge in graph.edges
        if edge.to.node is payload.to.node and edge.to.port is payload.to.port
          unless payload.from
            eventEdge = edge
            continue
          if edge.from.node is payload.from.node and edge.from.port is payload.from.port
            eventEdge = edge
      return unless eventEdge
      eventEdge.dataflowEdge.get('log').add
        type: command
        group: payload.group
        data: payload.data

  addNodeDataflow: (nfNode, dfGraph) ->
    return unless nfNode
    return if nfNode.dataflowNode

    # Load the component
    dfNode = @dataflow.plugins.nofloLibrary.getInstance nfNode.component,
      id: nfNode.id
      label: ( if nfNode.metadata.label? then nfNode.metadata.label else nfNode.id )
      x: ( if nfNode.metadata.x? then nfNode.metadata.x else 500 )
      y: ( if nfNode.metadata.y? then nfNode.metadata.y else 300 )
      parentGraph: dfGraph

    # Reference one another
    nfNode.dataflowNode = dfNode
    dfNode.nofloNode = nfNode

    dfGraph.nodes.add dfNode

  addNodeRuntime: (node, runtime) ->
    runtime.sendGraph 'addnode',
      id: node.id
      component: node.component
      metadata: node.metadata

  addEdgeDataflow: (nfEdge, dfGraph) ->
    return unless nfEdge
    return if nfEdge.dataflowEdge

    edgeToId = (edge) ->
      if edge.dataflowEdge
        return edge.dataflowEdge.id
      source = "#{edge.from.node} #{edge.from.port.toUpperCase()}"
      destination = "#{edge.to.port.toUpperCase()} #{edge.to.node}"
      "#{source} -> #{destination}"

    Edge = @dataflow.module 'edge'
    nfEdge.metadata = {} unless nfEdge.metadata
    dfEdge = new Edge.Model
      id: edgeToId nfEdge
      parentGraph: dfGraph
      source: nfEdge.from
      target: nfEdge.to
      route: ( if nfEdge.metadata.route? then nfEdge.metadata.route else 0 )

    # Reference one another
    dfEdge.nofloEdge = nfEdge
    nfEdge.dataflowEdge = dfEdge

    # Add to Graph
    dfGraph.edges.add dfEdge

  addEdgeRuntime: (edge, runtime) ->
    runtime.sendGraph 'addedge',
      from: edge.from
      to: edge.to

  addInitialDataflow: (iip, graph) ->
    return unless iip
    node = graph.nodes.get iip.to.node
    if node
      port = node.inputs.get iip.to.port
      if port
        node.setState iip.to.port, iip.from.data

  addInitialRuntime: (iip, runtime) ->
    runtime.sendGraph 'addinitial',
      from: iip.from
      to: iip.to

plugin = Dataflow::plugin 'nofloGraph'
Dataflow::plugins.nofloGraph = new NoFloGraphPlugin
