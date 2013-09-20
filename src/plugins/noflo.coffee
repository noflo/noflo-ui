{Dataflow} = require '/meemoo-dataflow'
Graph = Dataflow::module 'graph'

class NoFloPlugin
  constructor: ->
    @dataflow = null

  initialize: (@dataflow) ->
    # Modify behavior of other Dataflow plugins
    @dataflow.plugins.source.listeners false
    @dataflow.plugins.log.listeners false

  registerGraph: (graph, runtime, callback) ->
    dfGraph = @dataflow.loadGraph {}
    callback = if callback then callback else ->
    @prepareGraph graph, dfGraph, runtime, callback

    runtime.iframe.onload = =>
      runtime.sendGraph 'clear',
        baseDir: graph.baseDir
      for node in graph.nodes
        @addNodeRuntime node, runtime
      for edge in graph.edges
        @addEdgeRuntime edge, runtime
      for iip in graph.initializers
        @addInitialRuntime iip, runtime
      runtime.sendNetwork 'start'

  registerSubgraph: (graph, runtime, callback) ->
    dfGraph = new Graph.Model
      dataflow: @dataflow
    callback = if callback then callback else ->
    @prepareGraph graph, dfGraph, runtime, callback

  prepareGraph: (nofloGraph, dataflowGraph, runtime, callback) ->
    # Provide a reference to the NoFlo graph
    dataflowGraph.nofloGraph = nofloGraph

    # Provide a backreference to the Dataflow graph
    nofloGraph.dataflowGraph = dataflowGraph

    # Provide a runtime reference
    nofloGraph.runtime = runtime

    # Load components from iframe
    runtime.loadComponents nofloGraph.baseDir

    # Prepare NoFlo runtime
    runtime.sendGraph 'clear',
      baseDir: nofloGraph.baseDir

    @subscribeDataflowEvents dataflowGraph
    @subscribeNoFloEvents nofloGraph, runtime
    for node in nofloGraph.nodes
      @addNode node, dataflowGraph
    for edge in nofloGraph.edges
      @addEdge edge, dataflowGraph
    for iip in nofloGraph.initializers
      @addInitial iip, dataflowGraph


  subscribeDataflowEvents: (graph) ->
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
    unless node.nofloNode
      # Ensure IDs are strings
      id = node.id + ''
      node.nofloNode = graph.nofloGraph.getNode id
      unless node.nofloNode
        node.nofloNode = graph.nofloGraph.addNode id, node.type,
          x: node.get 'x'
          y: node.get 'y'

    node.on 'change:label', (node, newName) ->
      oldName = node.nofloNode.id
      graph.nofloGraph.renameNode oldName, newName + ''
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
      graph.nofloGraph.addInitial true, node.nofloNode.id, port, metadata

  subscribeDataflowEdge: (edge, graph) ->
    unless edge.nofloEdge
      try
        edge.nofloEdge = graph.nofloGraph.addEdge edge.source.parentNode.nofloNode.id, edge.source.id, edge.target.parentNode.nofloNode.id, edge.target.id,
          route: edge.get 'route'
      catch error
        # Not added, probably multiple w/o array port https://github.com/noflo/noflo/issues/90

    edge.on 'change:route', ->
      edge.nofloEdge.metadata.route = edge.get 'route'

  subscribeNoFloEvents: (graph, runtime) ->
    graph.on 'addNode', (node) =>
      @addNode node, graph.dataflowGraph
      @dataflow.plugins.log.add 'node added: ' + node.id
    graph.on 'removeNode', (node) =>
      if node.dataflowNode?
        node.dataflowNode.remove()
      @dataflow.plugins.log.add 'node removed: ' + node.id
      runtime.sendGraph 'removenode',
        id: node.id
    graph.on 'addEdge', (edge) =>
      @addEdge edge, graph.dataflowGraph
      @dataflow.plugins.log.add 'edge added.'
    graph.on 'removeEdge', (edge) =>
      if edge.from.node? and edge.to.node?
        if edge.dataflowEdge?
          edge.dataflowEdge.remove()
      @dataflow.plugins.log.add 'edge removed.'
      runtime.sendGraph 'removeedge',
        from: edge.from
        to: edge.to
    graph.on 'addInitial', (iip) =>
      @addInitial iip, graph.dataflowGraph
      @dataflow.plugins.log.add 'IIP added: ' + JSON.stringify(iip)
    graph.on 'removeInitial', (iip) =>
      @dataflow.plugins.log.add 'IIP removed: ' + JSON.stringify(iip)
      runtime.sendGraph 'removeinitial',
        from: iip.from
        to: iip.to

    # Pass network events to edge inspector
    runtime.listenNetwork (command, payload) ->
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

  addNode: (node, graph) ->
    return unless node

    @addNodeRuntime node, graph.nofloGraph.runtime

    unless node.dataflowNode
      # Load the component
      dfNode = graph.nofloGraph.runtime.getComponentInstance node.component,
        id: node.id
        label: node.id
        x: ( if node.metadata.x? then node.metadata.x else 300 )
        y: ( if node.metadata.y? then node.metadata.y else 300 )
        parentGraph: graph

      # Reference one another
      node.dataflowNode = dfNode
      node.nofloNode = node

    graph.nodes.add dfNode

  addNodeRuntime: (node, runtime) ->
    runtime.sendGraph 'addnode',
      id: node.id
      component: node.component
      metadata: node.metadata

  addEdge: (edge, graph) ->
    return unless edge

    @addEdgeRuntime edge, graph.nofloGraph.runtime

    unless edge.dataflowEdge
      Edge = @dataflow.module 'edge'
      edge.metadata = {} unless edge.metadata
      dfEdge = new Edge.Model
        id: edge.from.node + ":" + edge.from.port + "::" + edge.to.node + ":" + edge.to.port
        parentGraph: graph
        source: edge.from
        target: edge.to
        route: if edge.metadata.route then edge.metadata.route else 0

      # Reference one another
      dfEdge.nofloEdge = edge
      edge.dataflowEdge = dfEdge

    # Add to Graph
    graph.edges.add dfEdge

  addEdgeRuntime: (edge, runtime) ->
    runtime.sendGraph 'addedge',
      from: edge.from
      to: edge.to

  addInitial: (iip, graph) ->
    return unless iip

    @addInitialRuntime iip, graph.nofloGraph.runtime
    node = graph.nodes.get iip.to.node
    if node
      port = node.inputs.get iip.to.port
      if port
        node.setState iip.to.port, iip.from.data

  addInitialRuntime: (iip, runtime) ->
    runtime.sendGraph 'addinitial',
      from: iip.from
      to: iip.to

plugin = Dataflow::plugin 'noflo'
Dataflow::plugins.noflo = new NoFloPlugin
