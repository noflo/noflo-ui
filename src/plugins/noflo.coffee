{Dataflow} = require '/meemoo-dataflow'
Graph = Dataflow::module 'graph'

class NoFloPlugin
  constructor: ->
    @dataflow = null

  initialize: (@dataflow) ->
    # Modify behavior of other Dataflow plugins
    @dataflow.plugins.source.listeners false
    @dataflow.plugins.log.listeners false

    window.df = @dataflow

  registerGraph: (graph, runtime, callback) ->
    dfGraph = @dataflow.loadGraph {}
    callback = if callback then callback else ->
    @prepareGraph graph, dfGraph, runtime, callback

    runtime.listenReset =>
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

    # Load components from runtime
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
      graph.nofloGraph.addInitial true, node.nofloNode.id, port, metadata

  subscribeDataflowEdge: (edge, graph) ->
    unless edge.nofloEdge
      edge.nofloEdge = graph.nofloGraph.addEdge edge.source.parentNode.nofloNode.id, edge.source.id, edge.target.parentNode.nofloNode.id, edge.target.id,
        route: edge.get 'route'

    edge.on 'change:route', ->
      edge.nofloEdge.metadata.route = edge.get 'route'

  subscribeNoFloEvents: (graph, runtime) ->
    graph.on 'addNode', (nfNode) =>
      @addNode nfNode, graph.dataflowGraph
      @dataflow.plugins.log.add 'node added: ' + nfNode.id
    graph.on 'removeNode', (nfNode) =>
      if nfNode.dataflowNode?
        nfNode.dataflowNode.remove()
      @dataflow.plugins.log.add 'node removed: ' + nfNode.id
      runtime.sendGraph 'removenode',
        id: nfNode.id
    graph.on 'addEdge', (nfEdge) =>
      @addEdge nfEdge, graph.dataflowGraph
      @dataflow.plugins.log.add 'edge added.'
    graph.on 'removeEdge', (nfEdge) =>
      if nfEdge.from.node? and nfEdge.to.node?
        if nfEdge.dataflowEdge?
          nfEdge.dataflowEdge.remove()
      @dataflow.plugins.log.add 'edge removed.'
      runtime.sendGraph 'removeedge',
        from: nfEdge.from
        to: nfEdge.to
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

  addNode: (nfNode, dfGraph) ->
    return unless nfNode

    return if nfNode.dataflowNode?

    #HACK to not add twice
    return if dfGraph.nodes.findWhere({nofloId: nfNode.id})?

    @addNodeRuntime nfNode, dfGraph.nofloGraph.runtime

    # Load the component
    dfNode = dfGraph.nofloGraph.runtime.getComponentInstance nfNode.component,
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

  addEdge: (nfEdge, dfGraph) ->
    return unless nfEdge

    @addEdgeRuntime nfEdge, dfGraph.nofloGraph.runtime

    unless nfEdge.dataflowEdge
      Edge = @dataflow.module 'edge'
      nfEdge.metadata = {} unless nfEdge.metadata
      dfEdge = new Edge.Model
        id: nfEdge.from.node + ":" + nfEdge.from.port + "::" + nfEdge.to.node + ":" + nfEdge.to.port
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
