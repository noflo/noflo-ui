noflo = require 'noflo'
chai = require 'chai' unless chai
_ = require 'underscore'

UpdateGraph = require '../components/UpdateGraph.coffee'
BaseRuntime = require '../components/flowbased-fbp-protocol-client/src/base.coffee'

describe 'Update Graph', ->
  component = null
  graph = null
  graphSocket = null
  eventSocket = null

  beforeEach ->
    component = UpdateGraph.getComponent()
    graph = new noflo.Graph 'graph1'

    graphSocket = noflo.internalSocket.createSocket()
    component.inPorts.graph.attach graphSocket

    eventSocket = noflo.internalSocket.createSocket()
    component.inPorts.event.attach eventSocket

  describe 'instantiation', ->
    it 'should have a "graph" inport', ->
      chai.expect(component.inPorts.graph).to.be.an 'object'

    it 'should have a "event" inport', ->
      chai.expect(component.inPorts.event).to.be.an 'object'

    it 'should attach graph', ->
      graphSocket.send graph
      chai.expect(component.graph).to.equal graph

  describe 'graph events', ->
    beforeEach ->
      graphSocket.send graph

    it 'should receive addnode events', ->
      event =
        protocol: 'graph'
        command: 'addnode'
        payload:
          graph: 'graph1'
          id: 'abcd'
          component: 'core/Drop'
          metadata:
            label: 'Drop'
            x: 1.0
            y: 1.0

      chai.expect(graph.nodes.length).to.equal 0
      eventSocket.send event
      chai.expect(graph.nodes.length).to.equal 1

      node = graph.getNode event.payload.id
      chai.expect(node.component).to.equal event.payload.component

    it 'should receive removenode events', ->
      node =
        id: 'abcd'
        component: 'core/Drop'

      event =
        protocol: 'graph'
        command: 'removenode'
        payload:
          graph: 'graph1'
          id: 'abcd'

      graph.addNode node.id, node.component, {}

      chai.expect(graph.nodes.length).to.equal 1
      eventSocket.send event
      chai.expect(graph.nodes.length).to.equal 0

    it 'should receive changenode events', ->
      node =
        id: 'abcd'
        component: 'core/Drop'

      event =
        protocol: 'graph'
        command: 'changenode'
        payload:
          graph: 'graph1'
          id: 'abcd'
          metadata:
            label: 'after'

      graph.addNode node.id, node.component, label: 'before'

      chai.expect(graph.nodes.length).to.equal 1

      graphNode = graph.getNode node.id
      chai.expect(graphNode.metadata.label).to.equal 'before'

      eventSocket.send event
      chai.expect(graphNode.metadata.label).to.equal 'after'

    it 'should receive addedge events', ->
      node1 =
        id: 'abcd'
        component: 'core/Kick'
        metadata: {}

      node2 =
        id: 'efgh'
        component: 'core/Drop'
        metadata: {}

      event =
        protocol: 'graph'
        command: 'addedge'
        payload:
          graph: 'graph1'
          src:
            node: 'abcd'
            port: 'out'
          tgt:
            node: 'efgh'
            port: 'in'

      graph.addNode node1.id, node1.component, {}
      graph.addNode node2.id, node2.component, {}

      chai.expect(graph.edges.length).to.equal 0

      eventSocket.send event
      chai.expect(graph.edges.length).to.equal 1

      edge = graph.getEdge event.payload.src.node, event.payload.src.port,
        event.payload.tgt.node, event.payload.tgt.port

      chai.expect(edge).to.exist()

    it 'should receive addedge events with index', ->
      node1 =
        id: 'abcd'
        component: 'core/Kick'
        metadata: {}

      node2 =
        id: 'efgh'
        component: 'core/Drop'
        metadata: {}

      event =
        protocol: 'graph'
        command: 'addedge'
        payload:
          graph: 'graph1'
          src:
            node: 'abcd'
            port: 'out'
            index: 0
          tgt:
            node: 'efgh'
            port: 'in'
            index: 1

      graph.addNode node1.id, node1.component, {}
      graph.addNode node2.id, node2.component, {}

      chai.expect(graph.edges.length).to.equal 0

      eventSocket.send event
      chai.expect(graph.edges.length).to.equal 1

      edge = graph.getEdge event.payload.src.node, event.payload.src.port,
        event.payload.tgt.node, event.payload.tgt.port

      chai.expect(edge).to.exist()
      chai.expect(edge.from.index).to.equal 0
      chai.expect(edge.to.index).to.equal 1

    it 'should receive removeedge events', ->
      node1 =
        id: 'abcd'
        component: 'core/Kick'
        metadata: {}

      node2 =
        id: 'efgh'
        component: 'core/Drop'
        metadata: {}

      event =
        protocol: 'graph'
        command: 'removeedge'
        payload:
          graph: 'graph1'
          src:
            node: 'abcd'
            port: 'out'
          tgt:
            node: 'efgh'
            port: 'in'

      graph.addNode node1.id, node1.component, {}
      graph.addNode node2.id, node2.component, {}
      graph.addEdge node1.id, event.payload.src.port,
        node2.id, event.payload.tgt.port

      chai.expect(graph.edges.length).to.equal 1

      eventSocket.send event
      chai.expect(graph.edges.length).to.equal 0

    it 'should receive changeedge events', ->
      node1 =
        id: 'abcd'
        component: 'core/Kick'
        metadata: {}

      node2 =
        id: 'efgh'
        component: 'core/Drop'
        metadata: {}

      event =
        protocol: 'graph'
        command: 'changeedge'
        payload:
          graph: 'graph1'
          src:
            node: 'abcd'
            port: 'out'
          tgt:
            node: 'efgh'
            port: 'in'
          metadata:
            label: 'after'

      graph.addNode node1.id, node1.component, {}
      graph.addNode node2.id, node2.component, {}
      graph.addEdge node1.id, event.payload.src.port,
        node2.id, event.payload.tgt.port, label: 'before'

      chai.expect(graph.edges.length).to.equal 1
      edge = graph.getEdge event.payload.src.node, event.payload.src.port,
        event.payload.tgt.node, event.payload.tgt.port

      chai.expect(edge.metadata.label).to.equal 'before'
      eventSocket.send event

      chai.expect(edge.metadata.label).to.equal 'after'

    it 'should receive addinitial events', ->
      node =
        id: 'abcd'
        component: 'core/Drop'

      event =
        protocol: 'graph'
        command: 'addinitial'
        payload:
          graph: 'graph1'
          src:
            data: 'hello'
          tgt:
            node: 'abcd'
            port: 'in'

      graph.addNode node.id, node.component, {}

      chai.expect(graph.initializers.length).to.equal 0

      eventSocket.send event
      chai.expect(graph.initializers.length).to.equal 1

    it 'should receive addinitial events with index', ->
      node =
        id: 'abcd'
        component: 'core/Drop'

      event =
        protocol: 'graph'
        command: 'addinitial'
        payload:
          graph: 'graph1'
          src:
            data: 'hello'
          tgt:
            node: 'abcd'
            port: 'in'
            index: 0

      graph.addNode node.id, node.component, {}
      chai.expect(graph.initializers.length).to.equal 0

      eventSocket.send event

      chai.expect(graph.initializers.length).to.equal 1
      chai.expect(graph.initializers[0].to.index).to.equal 0

    it 'should receive removeinitial events', ->
      node =
        id: 'abcd'
        component: 'core/Drop'

      initial =
        data: 'hello'
        node: 'abcd'
        port: 'in'

      event =
        protocol: 'graph'
        command: 'removeinitial'
        payload:
          graph: 'graph1'
          tgt:
            node: 'abcd'
            port: 'in'

      graph.addNode node.id, node.component, {}
      graph.addInitial initial.data, initial.node, initial.port

      chai.expect(graph.initializers.length).to.equal 1

      eventSocket.send event
      chai.expect(graph.initializers.length).to.equal 0

    it 'should receive addinport events', ->
      node =
        id: 'abcd'
        component: 'core/Kick'

      event =
        protocol: 'graph'
        command: 'addinport'
        payload:
          graph: 'graph1'
          public: 'hello'
          node: 'abcd'
          port: 'out'
          metadata:
            label: 'abc'

      graph.addNode node.id, node.component, {}

      chai.expect(_.keys(graph.inports).length).to.equal 0

      eventSocket.send event
      chai.expect(_.keys(graph.inports).length).to.equal 1

    it 'should receive removeinport events', ->
      node =
        id: 'abcd'
        component: 'core/Kick'

      inport =
        public: 'hello'
        node: 'abcd'
        port: 'out'

      event =
        protocol: 'graph'
        command: 'removeinport'
        payload:
          graph: 'graph1'
          public: 'hello'

      graph.addNode node.id, node.component, {}
      graph.addInport inport.public, inport.node, inport.port

      chai.expect(_.keys(graph.inports).length).to.equal 1

      eventSocket.send event
      chai.expect(_.keys(graph.inports).length).to.equal 0

    it 'should receive renameinport events', ->
      node =
        id: 'abcd'
        component: 'core/Kick'

      inport =
        public: 'hello'
        node: 'abcd'
        port: 'out'

      event =
        protocol: 'graph'
        command: 'renameinport'
        payload:
          graph: 'graph1'
          from: 'hello'
          to: 'goodbye'

      graph.addNode node.id, node.component, {}
      graph.addInport inport.public, inport.node, inport.port

      chai.expect(_.keys(graph.inports).length).to.equal 1
      chai.expect(graph.inports[inport.public]).to.exist()
      chai.expect(graph.inports[event.payload.to]).not.to.exist()

      eventSocket.send event

      chai.expect(_.keys(graph.inports).length).to.equal 1
      chai.expect(graph.inports[inport.public]).not.to.exist()
      chai.expect(graph.inports[event.payload.to]).to.exist()

    it 'should receive addoutport events', ->
      node =
        id: 'abcd'
        component: 'core/Kick'

      event =
        protocol: 'graph'
        command: 'addoutport'
        payload:
          graph: 'graph1'
          public: 'hello'
          node: 'abcd'
          port: 'out'
          metadata:
            label: 'abc'

      graph.addNode node.id, node.component, {}

      chai.expect(_.keys(graph.outports).length).to.equal 0

      eventSocket.send event
      chai.expect(_.keys(graph.outports).length).to.equal 1

    it 'should receive removeoutport events', ->
      node =
        id: 'abcd'
        component: 'core/Kick'

      outport =
        public: 'hello'
        node: 'abcd'
        port: 'out'

      event =
        protocol: 'graph'
        command: 'removeoutport'
        payload:
          graph: 'graph1'
          public: 'hello'

      graph.addNode node.id, node.component, {}
      graph.addOutport outport.public, outport.node, outport.port

      chai.expect(_.keys(graph.outports).length).to.equal 1

      eventSocket.send event
      chai.expect(_.keys(graph.outports).length).to.equal 0

    it 'should receive renameoutport events', ->
      node =
        id: 'abcd'
        component: 'core/Kick'

      outport =
        public: 'hello'
        node: 'abcd'
        port: 'out'

      event =
        protocol: 'graph'
        command: 'renameoutport'
        payload:
          graph: 'graph1'
          from: 'hello'
          to: 'goodbye'

      graph.addNode node.id, node.component, {}
      graph.addOutport outport.public, outport.node, outport.port

      chai.expect(_.keys(graph.outports).length).to.equal 1
      chai.expect(graph.outports[outport.public]).to.exist()
      chai.expect(graph.outports[event.payload.to]).not.to.exist()

      eventSocket.send event

      chai.expect(_.keys(graph.outports).length).to.equal 1
      chai.expect(graph.outports[outport.public]).not.to.exist()
      chai.expect(graph.outports[event.payload.to]).to.exist()

    it 'should receive addgroup events', ->
      node1 =
        id: 'abcd'
        component: 'core/Kick'
        metadata: {}

      node2 =
        id: 'efgh'
        component: 'core/Drop'
        metadata: {}

      event =
        protocol: 'graph'
        command: 'addgroup'
        payload:
          graph: 'graph1'
          name: 'group1'
          nodes: [node1.id, node2.id]
          metadata: label: 'hello'

      graph.addNode node1.id, node1.component
      graph.addNode node2.id, node2.component

      chai.expect(graph.groups.length).to.equal 0

      eventSocket.send event
      chai.expect(graph.groups.length).to.equal 1

    it 'should receive removegroup events', ->
      node1 =
        id: 'abcd'
        component: 'core/Kick'
        metadata: {}

      node2 =
        id: 'efgh'
        component: 'core/Drop'
        metadata: {}

      group =
        name: 'group1'
        nodes: [node1.id, node2.id]

      event =
        protocol: 'graph'
        command: 'removegroup'
        payload:
          graph: 'graph1'
          name: 'group1'

      graph.addNode node1.id, node1.component
      graph.addNode node2.id, node2.component
      graph.addGroup group.name, group.nodes

      chai.expect(graph.groups.length).to.equal 1

      eventSocket.send event
      chai.expect(graph.groups.length).to.equal 0

    it 'should receive renamegroup events', ->
      node1 =
        id: 'abcd'
        component: 'core/Kick'
        metadata: {}

      node2 =
        id: 'efgh'
        component: 'core/Drop'
        metadata: {}

      group =
        name: 'group1'
        nodes: [node1.id, node2.id]

      event =
        protocol: 'graph'
        command: 'renamegroup'
        payload:
          graph: 'graph1'
          from: 'group1'
          to: 'group2'

      graph.addNode node1.id, node1.component
      graph.addNode node2.id, node2.component
      graph.addGroup group.name, group.nodes

      chai.expect(graph.groups.length).to.equal 1
      chai.expect(graph.groups[0].name).to.equal group.name

      eventSocket.send event
      chai.expect(graph.groups.length).to.equal 1
      chai.expect(graph.groups[0].name).to.equal event.payload.to

    it 'should receive changegroup events', ->
      node1 =
        id: 'abcd'
        component: 'core/Kick'
        metadata: {}

      node2 =
        id: 'efgh'
        component: 'core/Drop'
        metadata: {}

      group =
        name: 'group1'
        nodes: [node1.id, node2.id]
        metadata: label: 'hello'

      event =
        protocol: 'graph'
        command: 'changegroup'
        payload:
          graph: 'graph1'
          name: 'group1'
          metadata: label: 'goodbye'

      graph.addNode node1.id, node1.component
      graph.addNode node2.id, node2.component
      graph.addGroup group.name, group.nodes, group.metadata

      chai.expect(graph.groups.length).to.equal 1
      chai.expect(graph.groups[0].metadata.label).to.equal group.metadata.label

      eventSocket.send event
      chai.expect(graph.groups.length).to.equal 1
      chai.expect(graph.groups[0].metadata.label).to.equal event.payload.metadata.label
